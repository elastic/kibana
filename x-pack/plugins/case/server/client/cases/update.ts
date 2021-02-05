/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import {
  KibanaRequest,
  SavedObject,
  SavedObjectsBulkResponse,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
} from 'kibana/server';
import { flattenCaseSavedObject } from '../../routes/api/utils';

import {
  throwErrors,
  excess,
  CasesResponseRt,
  ESCasePatchRequest,
  CasePatchRequest,
  CasesResponse,
  CaseStatuses,
  CasesUpdateRequest,
  CasesUpdateRequestRt,
  CommentType,
  ESCaseAttributes,
  CaseType,
} from '../../../common/api';
import { buildCaseUserActions } from '../../services/user_actions/helpers';
import {
  getCaseToUpdate,
  transformCaseConnectorToEsConnector,
} from '../../routes/api/cases/helpers';

import { CaseServiceSetup, CaseUserActionServiceSetup } from '../../services';
import { CASE_COMMENT_SAVED_OBJECT } from '../../saved_object_types';
import { CaseClientImpl } from '..';

/**
 * Throws an error if any of the requests attempt to update a collection style cases' status field.
 */
function throwIfUpdateStatusOfCollection(
  requests: ESCasePatchRequest[],
  cases: SavedObjectsBulkResponse<ESCaseAttributes>
) {
  const casesMap = cases.saved_objects.reduce((acc, so) => {
    acc.set(so.id, so);
    return acc;
  }, new Map<string, SavedObject<ESCaseAttributes>>());

  const requestsUpdatingStatusOfCollection = requests.filter(
    (req) =>
      req.status !== undefined && casesMap.get(req.id)?.attributes.type === CaseType.collection
  );

  if (requestsUpdatingStatusOfCollection.length > 0) {
    const ids = requestsUpdatingStatusOfCollection.map((req) => req.id);
    throw Boom.badRequest(
      `Updating the status of a collection is not allowed ids: [${ids.join(', ')}]`
    );
  }
}

interface UpdateArgs {
  savedObjectsClient: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
  request: KibanaRequest;
  caseClient: CaseClientImpl;
  cases: CasesUpdateRequest;
}

export const update = async ({
  savedObjectsClient,
  caseService,
  userActionService,
  request,
  caseClient,
  cases,
}: UpdateArgs): Promise<CasesResponse> => {
  const query = pipe(
    excess(CasesUpdateRequestRt).decode(cases),
    fold(throwErrors(Boom.badRequest), identity)
  );

  const myCases = await caseService.getCases({
    client: savedObjectsClient,
    caseIds: query.cases.map((q) => q.id),
  });

  let nonExistingCases: CasePatchRequest[] = [];
  const conflictedCases = query.cases.filter((q) => {
    const myCase = myCases.saved_objects.find((c) => c.id === q.id);

    if (myCase && myCase.error) {
      nonExistingCases = [...nonExistingCases, q];
      return false;
    }
    return myCase == null || myCase?.version !== q.version;
  });

  if (nonExistingCases.length > 0) {
    throw Boom.notFound(
      `These cases ${nonExistingCases
        .map((c) => c.id)
        .join(', ')} do not exist. Please check you have the correct ids.`
    );
  }

  if (conflictedCases.length > 0) {
    throw Boom.conflict(
      `These cases ${conflictedCases
        .map((c) => c.id)
        .join(', ')} has been updated. Please refresh before saving additional updates.`
    );
  }

  const updateCases: ESCasePatchRequest[] = query.cases.map((updateCase) => {
    const currentCase = myCases.saved_objects.find((c) => c.id === updateCase.id);
    const { connector, ...thisCase } = updateCase;
    return currentCase != null
      ? getCaseToUpdate(currentCase.attributes, {
          ...thisCase,
          ...(connector != null
            ? { connector: transformCaseConnectorToEsConnector(connector) }
            : {}),
        })
      : { id: thisCase.id, version: thisCase.version };
  });

  const updateFilterCases = updateCases.filter((updateCase) => {
    const { id, version, ...updateCaseAttributes } = updateCase;
    return Object.keys(updateCaseAttributes).length > 0;
  });

  if (updateFilterCases.length <= 0) {
    throw Boom.notAcceptable('All update fields are identical to current version.');
  }

  throwIfUpdateStatusOfCollection(updateFilterCases, myCases);

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { username, full_name, email } = await caseService.getUser({ request });
  const updatedDt = new Date().toISOString();
  const updatedCases = await caseService.patchCases({
    client: savedObjectsClient,
    cases: updateFilterCases.map((thisCase) => {
      const { id: caseId, version, ...updateCaseAttributes } = thisCase;
      let closedInfo = {};
      if (updateCaseAttributes.status && updateCaseAttributes.status === CaseStatuses.closed) {
        closedInfo = {
          closed_at: updatedDt,
          closed_by: { email, full_name, username },
        };
      } else if (
        updateCaseAttributes.status &&
        (updateCaseAttributes.status === CaseStatuses.open ||
          updateCaseAttributes.status === CaseStatuses['in-progress'])
      ) {
        closedInfo = {
          closed_at: null,
          closed_by: null,
        };
      }
      return {
        caseId,
        updatedAttributes: {
          ...updateCaseAttributes,
          ...closedInfo,
          updated_at: updatedDt,
          updated_by: { email, full_name, username },
        },
        version,
      };
    }),
  });

  // If a status update occurred and the case is synced then we need to update all alerts' status
  // attached to the case to the new status.
  const casesWithStatusChangedAndSynced = updateFilterCases.filter((caseToUpdate) => {
    const currentCase = myCases.saved_objects.find((c) => c.id === caseToUpdate.id);
    return (
      currentCase != null &&
      caseToUpdate.status != null &&
      currentCase.attributes.status !== caseToUpdate.status &&
      currentCase.attributes.settings.syncAlerts
    );
  });

  // If syncAlerts setting turned on we need to update all alerts' status
  // attached to the case to the current status.
  const casesWithSyncSettingChangedToOn = updateFilterCases.filter((caseToUpdate) => {
    const currentCase = myCases.saved_objects.find((c) => c.id === caseToUpdate.id);
    return (
      currentCase != null &&
      caseToUpdate.settings?.syncAlerts != null &&
      currentCase.attributes.settings.syncAlerts !== caseToUpdate.settings.syncAlerts &&
      caseToUpdate.settings.syncAlerts
    );
  });

  for (const theCase of [...casesWithSyncSettingChangedToOn, ...casesWithStatusChangedAndSynced]) {
    const currentCase = myCases.saved_objects.find((c) => c.id === theCase.id);
    const totalComments = await caseService.getAllCaseComments({
      client: savedObjectsClient,
      id: theCase.id,
      options: {
        fields: [],
        filter: `${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.alert} OR ${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.generatedAlert}`,
        page: 1,
        perPage: 1,
      },
    });

    // TODO: double check that this logic will get all sub case comments and include them in the updates
    const caseComments = (await caseService.getAllCaseComments({
      client: savedObjectsClient,
      id: theCase.id,
      includeSubCaseComments: true,
      options: {
        fields: [],
        filter: `${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.alert} OR ${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.generatedAlert}`,
        page: 1,
        perPage: totalComments.total,
      },
      // The filter guarantees that the comments will be of type alert
    })) as SavedObjectsFindResponse<{ alertId: string | string[]; index: string }>;

    // TODO: comment about why we need this (aka alerts might come from different indices? so dedup them)
    const idsAndIndices = caseComments.saved_objects.reduce(
      (acc: { ids: string[]; indices: Set<string> }, comment) => {
        const alertId = comment.attributes.alertId;
        const ids = Array.isArray(alertId) ? alertId : [alertId];
        acc.ids.push(...ids);
        acc.indices.add(comment.attributes.index);
        return acc;
      },
      { ids: [], indices: new Set<string>() }
    );

    if (idsAndIndices.ids.length > 0) {
      caseClient.updateAlertsStatus({
        ids: idsAndIndices.ids,
        // Either there is a status update or the syncAlerts got turned on.
        status: theCase.status ?? currentCase?.attributes.status ?? CaseStatuses.open,
        indices: idsAndIndices.indices,
      });
    }
  }

  const returnUpdatedCase = myCases.saved_objects
    .filter((myCase) =>
      updatedCases.saved_objects.some((updatedCase) => updatedCase.id === myCase.id)
    )
    .map((myCase) => {
      const updatedCase = updatedCases.saved_objects.find((c) => c.id === myCase.id);
      return flattenCaseSavedObject({
        savedObject: {
          ...myCase,
          ...updatedCase,
          attributes: { ...myCase.attributes, ...updatedCase?.attributes },
          references: myCase.references,
          version: updatedCase?.version ?? myCase.version,
        },
      });
    });

  await userActionService.postUserActions({
    client: savedObjectsClient,
    actions: buildCaseUserActions({
      originalCases: myCases.saved_objects,
      updatedCases: updatedCases.saved_objects,
      actionDate: updatedDt,
      actionBy: { email, full_name, username },
    }),
  });

  return CasesResponseRt.encode(returnUpdatedCase);
};
