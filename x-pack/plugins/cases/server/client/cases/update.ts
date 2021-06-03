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
} from 'kibana/server';

import { nodeBuilder } from '../../../../../../src/plugins/data/common';

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
} from '../../../common/api';
import { buildCaseUserActions } from '../../services/user_actions/helpers';
import { getCaseToUpdate } from '../utils';

import { CasesService } from '../../services';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
} from '../../../common/constants';
import {
  createAlertUpdateRequest,
  transformCaseConnectorToEsConnector,
  flattenCaseSavedObject,
  isCommentRequestTypeAlertOrGenAlert,
} from '../../common';
import { createCaseError } from '../../common/error';
import { ENABLE_CASE_CONNECTOR } from '../../../common/constants';
import { UpdateAlertRequest } from '../alerts/client';
import { CasesClientInternal } from '../client_internal';
import { CasesClientArgs } from '..';
import { Operations, OwnerEntity } from '../../authorization';

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
 * Throws an error if any of the requests attempt to update the owner of a case.
 */
function throwIfUpdateOwner(requests: ESCasePatchRequest[]) {
  const requestsUpdatingOwner = requests.filter((req) => req.owner !== undefined);

  if (requestsUpdatingOwner.length > 0) {
    const ids = requestsUpdatingOwner.map((req) => req.id);
    throw Boom.badRequest(`Updating the owner of a case  is not allowed ids: [${ids.join(', ')}]`);
  }
}

/**
 * Throws an error if any of the requests attempt to update an individual style cases' type field to a collection
 * when alerts are attached to the case.
 */
async function throwIfInvalidUpdateOfTypeWithAlerts({
  requests,
  caseService,
  unsecuredSavedObjectsClient,
}: {
  requests: ESCasePatchRequest[];
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}) {
  const getAlertsForID = async (caseToUpdate: ESCasePatchRequest) => {
    const alerts = await caseService.getAllCaseComments({
      unsecuredSavedObjectsClient,
      id: caseToUpdate.id,
      options: {
        fields: [],
        // there should never be generated alerts attached to an individual case but we'll check anyway
        filter: nodeBuilder.or([
          nodeBuilder.is(`${CASE_COMMENT_SAVED_OBJECT}.attributes.type`, CommentType.alert),
          nodeBuilder.is(
            `${CASE_COMMENT_SAVED_OBJECT}.attributes.type`,
            CommentType.generatedAlert
          ),
        ]),
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
  unsecuredSavedObjectsClient,
}: {
  casesToSync: ESCasePatchRequest[];
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObjectsFindResponse<CommentAttributes>> {
  const idsOfCasesToSync = casesToSync.map((casePatchReq) => casePatchReq.id);

  // getAllCaseComments will by default get all the comments, unless page or perPage fields are set
  return caseService.getAllCaseComments({
    unsecuredSavedObjectsClient,
    id: idsOfCasesToSync,
    includeSubCaseComments: true,
    options: {
      filter: nodeBuilder.or([
        nodeBuilder.is(`${CASE_COMMENT_SAVED_OBJECT}.attributes.type`, CommentType.alert),
        nodeBuilder.is(`${CASE_COMMENT_SAVED_OBJECT}.attributes.type`, CommentType.generatedAlert),
      ]),
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
  unsecuredSavedObjectsClient,
}: {
  totalAlerts: SavedObjectsFindResponse<CommentAttributes>;
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
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
    unsecuredSavedObjectsClient,
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
  unsecuredSavedObjectsClient,
  casesClientInternal,
}: {
  casesWithSyncSettingChangedToOn: ESCasePatchRequest[];
  casesWithStatusChangedAndSynced: ESCasePatchRequest[];
  casesMap: Map<string, SavedObject<ESCaseAttributes>>;
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  casesClientInternal: CasesClientInternal;
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
    unsecuredSavedObjectsClient,
  });

  // get a map of sub case id to the sub case status
  const subCasesToStatus = await getSubCasesToStatus({
    totalAlerts,
    unsecuredSavedObjectsClient,
    caseService,
  });

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

  await casesClientInternal.alerts.updateStatus({ alerts: alertsToUpdate });
}

function partitionPatchRequest(
  casesMap: Map<string, SavedObject<ESCaseAttributes>>,
  patchReqCases: CasePatchRequest[]
): {
  nonExistingCases: CasePatchRequest[];
  conflictedCases: CasePatchRequest[];
  // This will be a deduped array of case IDs with their corresponding owner
  casesToAuthorize: OwnerEntity[];
} {
  const nonExistingCases: CasePatchRequest[] = [];
  const conflictedCases: CasePatchRequest[] = [];
  const casesToAuthorize: Map<string, OwnerEntity> = new Map<string, OwnerEntity>();

  for (const reqCase of patchReqCases) {
    const foundCase = casesMap.get(reqCase.id);

    if (!foundCase || foundCase.error) {
      nonExistingCases.push(reqCase);
    } else if (foundCase.version !== reqCase.version) {
      conflictedCases.push(reqCase);
      // let's try to authorize the conflicted case even though we'll fail after afterwards just in case
      casesToAuthorize.set(foundCase.id, { id: foundCase.id, owner: foundCase.attributes.owner });
    } else {
      casesToAuthorize.set(foundCase.id, { id: foundCase.id, owner: foundCase.attributes.owner });
    }
  }

  return {
    nonExistingCases,
    conflictedCases,
    casesToAuthorize: Array.from(casesToAuthorize.values()),
  };
}

/**
 * Updates the specified cases with new values
 *
 * @ignore
 */
export const update = async (
  cases: CasesPatchRequest,
  clientArgs: CasesClientArgs,
  casesClientInternal: CasesClientInternal
): Promise<CasesResponse> => {
  const {
    unsecuredSavedObjectsClient,
    caseService,
    userActionService,
    user,
    logger,
    authorization,
  } = clientArgs;
  const query = pipe(
    excess(CasesPatchRequestRt).decode(cases),
    fold(throwErrors(Boom.badRequest), identity)
  );

  try {
    const myCases = await caseService.getCases({
      unsecuredSavedObjectsClient,
      caseIds: query.cases.map((q) => q.id),
    });

    const casesMap = myCases.saved_objects.reduce((acc, so) => {
      acc.set(so.id, so);
      return acc;
    }, new Map<string, SavedObject<ESCaseAttributes>>());

    const { nonExistingCases, conflictedCases, casesToAuthorize } = partitionPatchRequest(
      casesMap,
      query.cases
    );

    await authorization.ensureAuthorized({
      entities: casesToAuthorize,
      operation: Operations.updateCase,
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

    if (!ENABLE_CASE_CONNECTOR) {
      throwIfUpdateType(updateFilterCases);
    }

    throwIfUpdateOwner(updateFilterCases);
    throwIfUpdateStatusOfCollection(updateFilterCases, casesMap);
    throwIfUpdateTypeCollectionToIndividual(updateFilterCases, casesMap);
    await throwIfInvalidUpdateOfTypeWithAlerts({
      requests: updateFilterCases,
      caseService,
      unsecuredSavedObjectsClient,
    });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { username, full_name, email } = user;
    const updatedDt = new Date().toISOString();
    const updatedCases = await caseService.patchCases({
      unsecuredSavedObjectsClient,
      cases: updateFilterCases.map((thisCase) => {
        // intentionally removing owner from the case so that we don't accidentally allow it to be updated
        const { id: caseId, version, owner, ...updateCaseAttributes } = thisCase;
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
      unsecuredSavedObjectsClient,
      casesClientInternal,
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

    await userActionService.bulkCreate({
      unsecuredSavedObjectsClient,
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
