/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import pMap from 'p-map';
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
  AssociationType,
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  CasePatchRequest,
  CasesPatchRequest,
  CasesPatchRequestRt,
  CasesResponse,
  CasesResponseRt,
  CaseStatuses,
  CaseType,
  CommentAttributes,
  CommentType,
  ENABLE_CASE_CONNECTOR,
  excess,
  MAX_CONCURRENT_SEARCHES,
  SUB_CASE_SAVED_OBJECT,
  throwErrors,
  MAX_TITLE_LENGTH,
  CaseAttributes,
} from '../../../common';
import { buildCaseUserActions } from '../../services/user_actions/helpers';
import { getCaseToUpdate } from '../utils';

import { CasesService } from '../../services';
import {
  createAlertUpdateRequest,
  createCaseError,
  flattenCaseSavedObject,
  isCommentRequestTypeAlertOrGenAlert,
} from '../../common';
import { UpdateAlertRequest } from '../alerts/types';
import { CasesClientInternal } from '../client_internal';
import { CasesClientArgs } from '..';
import { Operations, OwnerEntity } from '../../authorization';

/**
 * Throws an error if any of the requests attempt to update a collection style cases' status field.
 */
function throwIfUpdateStatusOfCollection(requests: UpdateRequestWithOriginalCase[]) {
  const requestsUpdatingStatusOfCollection = requests.filter(
    ({ updateReq, originalCase }) =>
      updateReq.status !== undefined && originalCase.attributes.type === CaseType.collection
  );

  if (requestsUpdatingStatusOfCollection.length > 0) {
    const ids = requestsUpdatingStatusOfCollection.map(({ updateReq }) => updateReq.id);
    throw Boom.badRequest(
      `Updating the status of a collection is not allowed ids: [${ids.join(', ')}]`
    );
  }
}

/**
 * Throws an error if any of the requests attempt to update a collection style case to an individual one.
 */
function throwIfUpdateTypeCollectionToIndividual(requests: UpdateRequestWithOriginalCase[]) {
  const requestsUpdatingTypeCollectionToInd = requests.filter(
    ({ updateReq, originalCase }) =>
      updateReq.type === CaseType.individual && originalCase.attributes.type === CaseType.collection
  );

  if (requestsUpdatingTypeCollectionToInd.length > 0) {
    const ids = requestsUpdatingTypeCollectionToInd.map(({ updateReq }) => updateReq.id);
    throw Boom.badRequest(
      `Converting a collection to an individual case is not allowed ids: [${ids.join(', ')}]`
    );
  }
}

/**
 * Throws an error if any of the requests attempt to update the type of a case.
 */
function throwIfUpdateType(requests: UpdateRequestWithOriginalCase[]) {
  const requestsUpdatingType = requests.filter(({ updateReq }) => updateReq.type !== undefined);

  if (requestsUpdatingType.length > 0) {
    const ids = requestsUpdatingType.map(({ updateReq }) => updateReq.id);
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
function throwIfUpdateOwner(requests: UpdateRequestWithOriginalCase[]) {
  const requestsUpdatingOwner = requests.filter(({ updateReq }) => updateReq.owner !== undefined);

  if (requestsUpdatingOwner.length > 0) {
    const ids = requestsUpdatingOwner.map(({ updateReq }) => updateReq.id);
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
  requests: UpdateRequestWithOriginalCase[];
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}) {
  const getAlertsForID = async ({ updateReq }: UpdateRequestWithOriginalCase) => {
    const alerts = await caseService.getAllCaseComments({
      unsecuredSavedObjectsClient,
      id: updateReq.id,
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

    return { id: updateReq.id, alerts };
  };

  const requestsUpdatingTypeField = requests.filter(
    ({ updateReq }) => updateReq.type === CaseType.collection
  );
  const getAlertsMapper = async (caseToUpdate: UpdateRequestWithOriginalCase) =>
    getAlertsForID(caseToUpdate);
  // Ensuring we don't too many concurrent get running.
  const casesAlertTotals = await pMap(requestsUpdatingTypeField, getAlertsMapper, {
    concurrency: MAX_CONCURRENT_SEARCHES,
  });

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
 * Throws an error if any of the requests updates a title and the length is over MAX_TITLE_LENGTH.
 */
function throwIfTitleIsInvalid(requests: UpdateRequestWithOriginalCase[]) {
  const requestsInvalidTitle = requests.filter(
    ({ updateReq }) => updateReq.title !== undefined && updateReq.title.length > MAX_TITLE_LENGTH
  );

  if (requestsInvalidTitle.length > 0) {
    const ids = requestsInvalidTitle.map(({ updateReq }) => updateReq.id);
    throw Boom.badRequest(
      `The length of the title is too long. The maximum length is ${MAX_TITLE_LENGTH}, ids: [${ids.join(
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
  casesToSync: UpdateRequestWithOriginalCase[];
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObjectsFindResponse<CommentAttributes>> {
  const idsOfCasesToSync = casesToSync.map(({ updateReq }) => updateReq.id);

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
  caseService,
  unsecuredSavedObjectsClient,
  casesClientInternal,
}: {
  casesWithSyncSettingChangedToOn: UpdateRequestWithOriginalCase[];
  casesWithStatusChangedAndSynced: UpdateRequestWithOriginalCase[];
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
  const casesToSyncToStatus = casesToSync.reduce((acc, { updateReq, originalCase }) => {
    acc.set(updateReq.id, updateReq.status ?? originalCase.attributes.status ?? CaseStatuses.open);
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
  casesMap: Map<string, SavedObject<CaseAttributes>>,
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

interface UpdateRequestWithOriginalCase {
  updateReq: CasePatchRequest;
  originalCase: SavedObject<CaseAttributes>;
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
    }, new Map<string, SavedObject<CaseAttributes>>());

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

    const updateCases: UpdateRequestWithOriginalCase[] = query.cases.reduce(
      (acc: UpdateRequestWithOriginalCase[], updateCase) => {
        const originalCase = casesMap.get(updateCase.id);

        if (!originalCase) {
          return acc;
        }

        const fieldsToUpdate = getCaseToUpdate(originalCase.attributes, updateCase);

        const { id, version, ...restFields } = fieldsToUpdate;

        if (Object.keys(restFields).length > 0) {
          acc.push({ originalCase, updateReq: fieldsToUpdate });
        }

        return acc;
      },
      []
    );

    if (updateCases.length <= 0) {
      throw Boom.notAcceptable('All update fields are identical to current version.');
    }

    if (!ENABLE_CASE_CONNECTOR) {
      throwIfUpdateType(updateCases);
    }

    throwIfUpdateOwner(updateCases);
    throwIfTitleIsInvalid(updateCases);
    throwIfUpdateStatusOfCollection(updateCases);
    throwIfUpdateTypeCollectionToIndividual(updateCases);
    await throwIfInvalidUpdateOfTypeWithAlerts({
      requests: updateCases,
      caseService,
      unsecuredSavedObjectsClient,
    });

    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { username, full_name, email } = user;
    const updatedDt = new Date().toISOString();
    const updatedCases = await caseService.patchCases({
      unsecuredSavedObjectsClient,
      cases: updateCases.map(({ updateReq, originalCase }) => {
        // intentionally removing owner from the case so that we don't accidentally allow it to be updated
        const { id: caseId, version, owner, ...updateCaseAttributes } = updateReq;
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
          originalCase,
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
    const casesWithStatusChangedAndSynced = updateCases.filter(({ updateReq, originalCase }) => {
      return (
        originalCase != null &&
        updateReq.status != null &&
        originalCase.attributes.status !== updateReq.status &&
        originalCase.attributes.settings.syncAlerts
      );
    });

    // If syncAlerts setting turned on we need to update all alerts' status
    // attached to the case to the current status.
    const casesWithSyncSettingChangedToOn = updateCases.filter(({ updateReq, originalCase }) => {
      return (
        originalCase != null &&
        updateReq.settings?.syncAlerts != null &&
        originalCase.attributes.settings.syncAlerts !== updateReq.settings.syncAlerts &&
        updateReq.settings.syncAlerts
      );
    });

    // Update the alert's status to match any case status or sync settings changes
    await updateAlerts({
      casesWithStatusChangedAndSynced,
      casesWithSyncSettingChangedToOn,
      caseService,
      unsecuredSavedObjectsClient,
      casesClientInternal,
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
