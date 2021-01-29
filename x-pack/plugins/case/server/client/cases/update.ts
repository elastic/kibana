/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';
import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import { SavedObjectsFindResponse } from 'kibana/server';
import { flattenCaseSavedObject } from '../../routes/api/utils';

import {
  throwErrors,
  excess,
  CasesResponseRt,
  CasesPatchRequestRt,
  ESCasePatchRequest,
  CasePatchRequest,
  CasesResponse,
  CaseStatuses,
} from '../../../common/api';
import { buildCaseUserActions } from '../../services/user_actions/helpers';
import {
  getCaseToUpdate,
  transformCaseConnectorToEsConnector,
} from '../../routes/api/cases/helpers';

import { CaseClientUpdate, CaseClientFactoryArguments } from '../types';

export const update = ({
  savedObjectsClient,
  caseService,
  userActionService,
  request,
}: CaseClientFactoryArguments) => async ({
  caseClient,
  cases,
}: CaseClientUpdate): Promise<CasesResponse> => {
  const query = pipe(
    excess(CasesPatchRequestRt).decode(cases),
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

  if (updateFilterCases.length > 0) {
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

    for (const theCase of [
      ...casesWithSyncSettingChangedToOn,
      ...casesWithStatusChangedAndSynced,
    ]) {
      const currentCase = myCases.saved_objects.find((c) => c.id === theCase.id);
      const totalComments = await caseService.getAllCaseComments({
        client: savedObjectsClient,
        caseId: theCase.id,
        options: {
          fields: [],
          filter: 'cases-comments.attributes.type: alert',
          page: 1,
          perPage: 1,
        },
      });

      const caseComments = (await caseService.getAllCaseComments({
        client: savedObjectsClient,
        caseId: theCase.id,
        options: {
          fields: [],
          filter: 'cases-comments.attributes.type: alert',
          page: 1,
          perPage: totalComments.total,
        },
        // The filter guarantees that the comments will be of type alert
      })) as SavedObjectsFindResponse<{ alertId: string }>;

      const commentIds = caseComments.saved_objects.map(({ attributes: { alertId } }) => alertId);
      if (commentIds.length > 0) {
        caseClient.updateAlertsStatus({
          ids: commentIds,
          // Either there is a status update or the syncAlerts got turned on.
          status: theCase.status ?? currentCase?.attributes.status ?? CaseStatuses.open,
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
  }
  throw Boom.notAcceptable('All update fields are identical to current version.');
};
