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
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  Logger,
} from 'kibana/server';
import {
  flattenCaseSavedObject,
  isCommentRequestTypeAlertOrGenAlert,
} from '../../routes/api/utils';

import {
  throwErrors,
  excess,
  CasesResponseRt,
  ESCasePatchRequest,
  CasePatchRequest,
  CasesResponse,
  CaseStatuses,
  CasesPatchRequestRt,
  CommentType,
  ESCaseAttributes,
  CaseType,
  CasesPatchRequest,
  AssociationType,
  CommentAttributes,
  User,
} from '../../../common';
import { buildCaseUserActions } from '../../services/user_actions/helpers';
import {
  getCaseToUpdate,
  transformCaseConnectorToEsConnector,
} from '../../routes/api/cases/helpers';

import { CaseServiceSetup, CaseUserActionServiceSetup } from '../../services';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
} from '../../saved_object_types';
import { CasesClientHandler } from '..';
import { createAlertUpdateRequest } from '../../common';
import { UpdateAlertRequest } from '../types';
import { createCaseError } from '../../common/error';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';

/**
 * Throws an error if any of the requests attempt to update a collection style cases' status field.
 */
function throwIfUpdateStatusOfCollection(
  requests: ESCasePatchRequest[],
  casesMap: Map<string, SavedObject<ESCaseAttributes>>
) {
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

/**
 * Throws an error if any of the requests attempt to update a collection style case to an individual one.
 */
function throwIfUpdateTypeCollectionToIndividual(
  requests: ESCasePatchRequest[],
  casesMap: Map<string, SavedObject<ESCaseAttributes>>
) {
  const requestsUpdatingTypeCollectionToInd = requests.filter(
    (req) =>
      req.type === CaseType.individual &&
      casesMap.get(req.id)?.attributes.type === CaseType.collection
  );

  if (requestsUpdatingTypeCollectionToInd.length > 0) {
    const ids = requestsUpdatingTypeCollectionToInd.map((req) => req.id);
    throw Boom.badRequest(
      `Converting a collection to an individual case is not allowed ids: [${ids.join(', ')}]`
    );
  }
}

/**
 * Throws an error if any of the requests attempt to update the type of a case.
 */
function throwIfUpdateType(requests: ESCasePatchRequest[]) {
  const requestsUpdatingType = requests.filter((req) => req.type !== undefined);

  if (requestsUpdatingType.length > 0) {
    const ids = requestsUpdatingType.map((req) => req.id);
    throw Boom.badRequest(
      `Updating the type of a case when sub cases are disabled is not allowed ids: [${ids.join(
        ', '
      )}]`
    );
  }
}

/**
 * Throws an error if any of the requests attempt to update an individual style cases' type field to a collection
 * when alerts are attached to the case.
 */
async function throwIfInvalidUpdateOfTypeWithAlerts({
  requests,
  caseService,
  client,
}: {
  requests: ESCasePatchRequest[];
  caseService: CaseServiceSetup;
  client: SavedObjectsClientContract;
}) {
  const getAlertsForID = async (caseToUpdate: ESCasePatchRequest) => {
    const alerts = await caseService.getAllCaseComments({
      client,
      id: caseToUpdate.id,
      options: {
        fields: [],
        // there should never be generated alerts attached to an individual case but we'll check anyway
        filter: `${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.alert} OR ${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.generatedAlert}`,
        page: 1,
        perPage: 1,
      },
    });

    return { id: caseToUpdate.id, alerts };
  };

  const requestsUpdatingTypeField = requests.filter((req) => req.type === CaseType.collection);
  const casesAlertTotals = await Promise.all(
    requestsUpdatingTypeField.map((caseToUpdate) => getAlertsForID(caseToUpdate))
  );

  // grab the cases that have at least one alert comment attached to them
  const typeUpdateWithAlerts = casesAlertTotals.filter((caseInfo) => caseInfo.alerts.total > 0);

  if (typeUpdateWithAlerts.length > 0) {
    const ids = typeUpdateWithAlerts.map((req) => req.id);
    throw Boom.badRequest(
      `Converting a case to a collection is not allowed when it has alert comments, ids: [${ids.join(
        ', '
      )}]`
    );
  }
}

/**
 * Get the id from a reference in a comment for a specific type.
 */
function getID(
  comment: SavedObject<CommentAttributes>,
  type: typeof CASE_SAVED_OBJECT | typeof SUB_CASE_SAVED_OBJECT
): string | undefined {
  return comment.references.find((ref) => ref.type === type)?.id;
}

/**
 * Gets all the alert comments (generated or user alerts) for the requested cases.
 */
async function getAlertComments({
  casesToSync,
  caseService,
  client,
}: {
  casesToSync: ESCasePatchRequest[];
  caseService: CaseServiceSetup;
  client: SavedObjectsClientContract;
}): Promise<SavedObjectsFindResponse<CommentAttributes>> {
  const idsOfCasesToSync = casesToSync.map((casePatchReq) => casePatchReq.id);

  // getAllCaseComments will by default get all the comments, unless page or perPage fields are set
  return caseService.getAllCaseComments({
    client,
    id: idsOfCasesToSync,
    includeSubCaseComments: true,
    options: {
      filter: `${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.alert} OR ${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.generatedAlert}`,
    },
  });
}

/**
 * Returns a map of sub case IDs to their status. This uses a group of alert comments to determine which sub cases should
 * be retrieved. This is based on whether the comment is associated to a sub case.
 */
async function getSubCasesToStatus({
  totalAlerts,
  caseService,
  client,
}: {
  totalAlerts: SavedObjectsFindResponse<CommentAttributes>;
  caseService: CaseServiceSetup;
  client: SavedObjectsClientContract;
}): Promise<Map<string, CaseStatuses>> {
  const subCasesToRetrieve = totalAlerts.saved_objects.reduce((acc, alertComment) => {
    if (
      isCommentRequestTypeAlertOrGenAlert(alertComment.attributes) &&
      alertComment.attributes.associationType === AssociationType.subCase
    ) {
      const id = getID(alertComment, SUB_CASE_SAVED_OBJECT);
      if (id !== undefined) {
        acc.add(id);
      }
    }
    return acc;
  }, new Set<string>());

  const subCases = await caseService.getSubCases({
    ids: Array.from(subCasesToRetrieve.values()),
    client,
  });

  return subCases.saved_objects.reduce((acc, subCase) => {
    // log about the sub cases that we couldn't find
    if (!subCase.error) {
      acc.set(subCase.id, subCase.attributes.status);
    }
    return acc;
  }, new Map<string, CaseStatuses>());
}

/**
 * Returns what status the alert comment should have based on whether it is associated to a case or sub case.
 */
function getSyncStatusForComment({
  alertComment,
  casesToSyncToStatus,
  subCasesToStatus,
}: {
  alertComment: SavedObjectsFindResult<CommentAttributes>;
  casesToSyncToStatus: Map<string, CaseStatuses>;
  subCasesToStatus: Map<string, CaseStatuses>;
}): CaseStatuses {
  let status: CaseStatuses = CaseStatuses.open;
  if (alertComment.attributes.associationType === AssociationType.case) {
    const id = getID(alertComment, CASE_SAVED_OBJECT);
    // We should log if we can't find the status
    // attempt to get the case status from our cases to sync map if we found the ID otherwise default to open
    status =
      id !== undefined ? casesToSyncToStatus.get(id) ?? CaseStatuses.open : CaseStatuses.open;
  } else if (alertComment.attributes.associationType === AssociationType.subCase) {
    const id = getID(alertComment, SUB_CASE_SAVED_OBJECT);
    status = id !== undefined ? subCasesToStatus.get(id) ?? CaseStatuses.open : CaseStatuses.open;
  }
  return status;
}

/**
 * Updates the alert ID's status field based on the patch requests
 */
async function updateAlerts({
  casesWithSyncSettingChangedToOn,
  casesWithStatusChangedAndSynced,
  casesMap,
  caseService,
  client,
  casesClient,
}: {
  casesWithSyncSettingChangedToOn: ESCasePatchRequest[];
  casesWithStatusChangedAndSynced: ESCasePatchRequest[];
  casesMap: Map<string, SavedObject<ESCaseAttributes>>;
  caseService: CaseServiceSetup;
  client: SavedObjectsClientContract;
  casesClient: CasesClientHandler;
}) {
  /**
   * It's possible that a case ID can appear multiple times in each array. I'm intentionally placing the status changes
   * last so when the map is built we will use the last status change as the source of truth.
   */
  const casesToSync = [...casesWithSyncSettingChangedToOn, ...casesWithStatusChangedAndSynced];

  // build a map of case id to the status it has
  // this will have collections in it but the alerts should be associated to sub cases and not collections so it shouldn't
  // matter.
  const casesToSyncToStatus = casesToSync.reduce((acc, caseInfo) => {
    acc.set(
      caseInfo.id,
      caseInfo.status ?? casesMap.get(caseInfo.id)?.attributes.status ?? CaseStatuses.open
    );
    return acc;
  }, new Map<string, CaseStatuses>());

  // get all the alerts for all the alert comments for all cases and collections. Collections themselves won't have any
  // but their sub cases could
  const totalAlerts = await getAlertComments({
    casesToSync,
    caseService,
    client,
  });

  // get a map of sub case id to the sub case status
  const subCasesToStatus = await getSubCasesToStatus({ totalAlerts, client, caseService });

  // create an array of requests that indicate the id, index, and status to update an alert
  const alertsToUpdate = totalAlerts.saved_objects.reduce(
    (acc: UpdateAlertRequest[], alertComment) => {
      if (isCommentRequestTypeAlertOrGenAlert(alertComment.attributes)) {
        const status = getSyncStatusForComment({
          alertComment,
          casesToSyncToStatus,
          subCasesToStatus,
        });

        acc.push(...createAlertUpdateRequest({ comment: alertComment.attributes, status }));
      }

      return acc;
    },
    []
  );

  await casesClient.updateAlertsStatus({ alerts: alertsToUpdate });
}

interface UpdateArgs {
  savedObjectsClient: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
  user: User;
  casesClient: CasesClientHandler;
  cases: CasesPatchRequest;
  logger: Logger;
}

export const update = async ({
  savedObjectsClient,
  caseService,
  userActionService,
  user,
  casesClient,
  cases,
  logger,
}: UpdateArgs): Promise<CasesResponse> => {
  const query = pipe(
    excess(CasesPatchRequestRt).decode(cases),
    fold(throwErrors(Boom.badRequest), identity)
  );

  try {
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

    const casesMap = myCases.saved_objects.reduce((acc, so) => {
      acc.set(so.id, so);
      return acc;
    }, new Map<string, SavedObject<ESCaseAttributes>>());

    if (!ENABLE_CASE_CONNECTOR) {
      throwIfUpdateType(updateFilterCases);
    }

    throwIfUpdateStatusOfCollection(updateFilterCases, casesMap);
    throwIfUpdateTypeCollectionToIndividual(updateFilterCases, casesMap);
    await throwIfInvalidUpdateOfTypeWithAlerts({
      requests: updateFilterCases,
      caseService,
      client: savedObjectsClient,
    });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { username, full_name, email } = user;
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

    // Update the alert's status to match any case status or sync settings changes
    await updateAlerts({
      casesWithStatusChangedAndSynced,
      casesWithSyncSettingChangedToOn,
      caseService,
      client: savedObjectsClient,
      casesClient,
      casesMap,
    });

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
  } catch (error) {
    const idVersions = cases.cases.map((caseInfo) => ({
      id: caseInfo.id,
      version: caseInfo.version,
    }));

    throw createCaseError({
      message: `Failed to update case, ids: ${JSON.stringify(idVersions)}: ${error}`,
      error,
      logger,
    });
  }
};
