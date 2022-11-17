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

import type {
  SavedObject,
  SavedObjectsBulkUpdateResponse,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
  SavedObjectsUpdateResponse,
} from '@kbn/core/server';

import { nodeBuilder } from '@kbn/es-query';

import { areTotalAssigneesInvalid } from '../../../common/utils/validators';
import type {
  CaseAssignees,
  CaseAttributes,
  CasePatchRequest,
  CaseResponse,
  CasesPatchRequest,
  CasesResponse,
  CommentAttributes,
  User,
} from '../../../common/api';
import {
  CasesPatchRequestRt,
  CasesResponseRt,
  CaseStatuses,
  CommentType,
  excess,
  throwErrors,
} from '../../../common/api';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  MAX_ASSIGNEES_PER_CASE,
  MAX_TITLE_LENGTH,
} from '../../../common/constants';

import { arraysDifference, getCaseToUpdate } from '../utils';

import type { AlertService, CasesService } from '../../services';
import { createCaseError } from '../../common/error';
import {
  createAlertUpdateRequest,
  flattenCaseSavedObject,
  isCommentRequestTypeAlert,
} from '../../common/utils';
import type { UpdateAlertRequest } from '../alerts/types';
import type { CasesClientArgs } from '..';
import type { OwnerEntity } from '../../authorization';
import { Operations } from '../../authorization';
import { dedupAssignees, getClosedInfoForUpdate, getDurationForUpdate } from './utils';
import { LICENSING_CASE_ASSIGNMENT_FEATURE } from '../../common/constants';
import type { LicensingService } from '../../services/licensing';
import type { CaseSavedObject } from '../../common/types';

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
 * Throws an error if any of the requests attempt to update the assignees of the case
 * without the appropriate license
 */
function throwIfUpdateAssigneesWithoutValidLicense(
  requests: UpdateRequestWithOriginalCase[],
  hasPlatinumLicenseOrGreater: boolean
) {
  if (hasPlatinumLicenseOrGreater) {
    return;
  }

  const requestsUpdatingAssignees = requests.filter(
    ({ updateReq }) => updateReq.assignees !== undefined
  );

  if (requestsUpdatingAssignees.length > 0) {
    const ids = requestsUpdatingAssignees.map(({ updateReq }) => updateReq.id);
    throw Boom.forbidden(
      `In order to assign users to cases, you must be subscribed to an Elastic Platinum license, ids: [${ids.join(
        ', '
      )}]`
    );
  }
}

function notifyPlatinumUsage(
  licensingService: LicensingService,
  requests: UpdateRequestWithOriginalCase[]
) {
  const requestsUpdatingAssignees = requests.filter(
    ({ updateReq }) => updateReq.assignees !== undefined
  );

  if (requestsUpdatingAssignees.length > 0) {
    licensingService.notifyUsage(LICENSING_CASE_ASSIGNMENT_FEATURE);
  }
}

/**
 * Throws an error if any of the requests attempt to add more than
 * MAX_ASSIGNEES_PER_CASE to a case
 */
function throwIfTotalAssigneesAreInvalid(requests: UpdateRequestWithOriginalCase[]) {
  const requestsUpdatingAssignees = requests.filter(
    ({ updateReq }) => updateReq.assignees !== undefined
  );

  if (
    requestsUpdatingAssignees.some(({ updateReq }) => areTotalAssigneesInvalid(updateReq.assignees))
  ) {
    const ids = requestsUpdatingAssignees.map(({ updateReq }) => updateReq.id);
    throw Boom.badRequest(
      `You cannot assign more than ${MAX_ASSIGNEES_PER_CASE} assignees to a case, ids: [${ids.join(
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
  type: typeof CASE_SAVED_OBJECT
): string | undefined {
  return comment.references.find((ref) => ref.type === type)?.id;
}

/**
 * Gets all the alert comments (generated or user alerts) for the requested cases.
 */
async function getAlertComments({
  casesToSync,
  caseService,
}: {
  casesToSync: UpdateRequestWithOriginalCase[];
  caseService: CasesService;
}): Promise<SavedObjectsFindResponse<CommentAttributes>> {
  const idsOfCasesToSync = casesToSync.map(({ updateReq }) => updateReq.id);

  // getAllCaseComments will by default get all the comments, unless page or perPage fields are set
  return caseService.getAllCaseComments({
    id: idsOfCasesToSync,
    options: {
      filter: nodeBuilder.is(`${CASE_COMMENT_SAVED_OBJECT}.attributes.type`, CommentType.alert),
    },
  });
}

/**
 * Returns what status the alert comment should have based on whether it is associated to a case.
 */
function getSyncStatusForComment({
  alertComment,
  casesToSyncToStatus,
}: {
  alertComment: SavedObjectsFindResult<CommentAttributes>;
  casesToSyncToStatus: Map<string, CaseStatuses>;
}): CaseStatuses {
  const id = getID(alertComment, CASE_SAVED_OBJECT);

  if (!id) {
    return CaseStatuses.open;
  }

  return casesToSyncToStatus.get(id) ?? CaseStatuses.open;
}

/**
 * Updates the alert ID's status field based on the patch requests
 */
async function updateAlerts({
  casesWithSyncSettingChangedToOn,
  casesWithStatusChangedAndSynced,
  caseService,
  alertsService,
}: {
  casesWithSyncSettingChangedToOn: UpdateRequestWithOriginalCase[];
  casesWithStatusChangedAndSynced: UpdateRequestWithOriginalCase[];
  caseService: CasesService;
  alertsService: AlertService;
}) {
  /**
   * It's possible that a case ID can appear multiple times in each array. I'm intentionally placing the status changes
   * last so when the map is built we will use the last status change as the source of truth.
   */
  const casesToSync = [...casesWithSyncSettingChangedToOn, ...casesWithStatusChangedAndSynced];

  // build a map of case id to the status it has
  const casesToSyncToStatus = casesToSync.reduce((acc, { updateReq, originalCase }) => {
    acc.set(updateReq.id, updateReq.status ?? originalCase.attributes.status ?? CaseStatuses.open);
    return acc;
  }, new Map<string, CaseStatuses>());

  // get all the alerts for all the alert comments for all cases
  const totalAlerts = await getAlertComments({
    casesToSync,
    caseService,
  });

  // create an array of requests that indicate the id, index, and status to update an alert
  const alertsToUpdate = totalAlerts.saved_objects.reduce(
    (acc: UpdateAlertRequest[], alertComment) => {
      if (isCommentRequestTypeAlert(alertComment.attributes)) {
        const status = getSyncStatusForComment({
          alertComment,
          casesToSyncToStatus,
        });

        acc.push(...createAlertUpdateRequest({ comment: alertComment.attributes, status }));
      }

      return acc;
    },
    []
  );

  await alertsService.updateAlertsStatus(alertsToUpdate);
}

function partitionPatchRequest(
  casesMap: Map<string, CaseSavedObject>,
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
  originalCase: CaseSavedObject;
}

/**
 * Updates the specified cases with new values
 *
 * @ignore
 */
export const update = async (
  cases: CasesPatchRequest,
  clientArgs: CasesClientArgs
): Promise<CasesResponse> => {
  const {
    services: {
      caseService,
      userActionService,
      alertsService,
      licensingService,
      notificationService,
    },
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
      caseIds: query.cases.map((q) => q.id),
    });

    /**
     * Warning: The code below assumes that the
     * casesMap is immutable. It should be used
     * only for read.
     */
    const casesMap = myCases.saved_objects.reduce((acc, so) => {
      acc.set(so.id, so);
      return acc;
    }, new Map<string, CaseSavedObject>());

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

    const casesToUpdate: UpdateRequestWithOriginalCase[] = query.cases.reduce(
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

    if (casesToUpdate.length <= 0) {
      throw Boom.notAcceptable('All update fields are identical to current version.');
    }

    const hasPlatinumLicense = await licensingService.isAtLeastPlatinum();

    throwIfUpdateOwner(casesToUpdate);
    throwIfTitleIsInvalid(casesToUpdate);
    throwIfUpdateAssigneesWithoutValidLicense(casesToUpdate, hasPlatinumLicense);
    throwIfTotalAssigneesAreInvalid(casesToUpdate);

    notifyPlatinumUsage(licensingService, casesToUpdate);

    const updatedCases = await patchCases({ caseService, user, casesToUpdate });

    // If a status update occurred and the case is synced then we need to update all alerts' status
    // attached to the case to the new status.
    const casesWithStatusChangedAndSynced = casesToUpdate.filter(({ updateReq, originalCase }) => {
      return (
        originalCase != null &&
        updateReq.status != null &&
        originalCase.attributes.status !== updateReq.status &&
        originalCase.attributes.settings.syncAlerts
      );
    });

    // If syncAlerts setting turned on we need to update all alerts' status
    // attached to the case to the current status.
    const casesWithSyncSettingChangedToOn = casesToUpdate.filter(({ updateReq, originalCase }) => {
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
      alertsService,
    });

    const returnUpdatedCase = updatedCases.saved_objects.reduce((flattenCases, updatedCase) => {
      const originalCase = casesMap.get(updatedCase.id);

      if (!originalCase) {
        return flattenCases;
      }

      return [
        ...flattenCases,
        flattenCaseSavedObject({
          savedObject: mergeOriginalSOWithUpdatedSO(originalCase, updatedCase),
        }),
      ];
    }, [] as CaseResponse[]);

    await userActionService.bulkCreateUpdateCase({
      originalCases: myCases.saved_objects,
      updatedCases: updatedCases.saved_objects,
      user,
    });

    const casesAndAssigneesToNotifyForAssignment = getCasesAndAssigneesToNotifyForAssignment(
      updatedCases,
      casesMap,
      user
    );

    await notificationService.bulkNotifyAssignees(casesAndAssigneesToNotifyForAssignment);

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

const patchCases = async ({
  caseService,
  casesToUpdate,
  user,
}: {
  caseService: CasesService;
  casesToUpdate: UpdateRequestWithOriginalCase[];
  user: User;
}) => {
  const updatedDt = new Date().toISOString();

  const updatedCases = await caseService.patchCases({
    cases: casesToUpdate.map(({ updateReq, originalCase }) => {
      // intentionally removing owner from the case so that we don't accidentally allow it to be updated
      const { id: caseId, version, owner, assignees, ...updateCaseAttributes } = updateReq;

      const dedupedAssignees = dedupAssignees(assignees);

      return {
        caseId,
        originalCase,
        updatedAttributes: {
          ...updateCaseAttributes,
          ...(dedupedAssignees && { assignees: dedupedAssignees }),
          ...getClosedInfoForUpdate({
            user,
            closedDate: updatedDt,
            status: updateCaseAttributes.status,
          }),
          ...getDurationForUpdate({
            status: updateCaseAttributes.status,
            closedAt: updatedDt,
            createdAt: originalCase.attributes.created_at,
          }),
          updated_at: updatedDt,
          updated_by: user,
        },
        version,
      };
    }),
    refresh: false,
  });

  return updatedCases;
};

const getCasesAndAssigneesToNotifyForAssignment = (
  updatedCases: SavedObjectsBulkUpdateResponse<CaseAttributes>,
  casesMap: Map<string, CaseSavedObject>,
  user: CasesClientArgs['user']
) => {
  return updatedCases.saved_objects.reduce<
    Array<{ assignees: CaseAssignees; theCase: CaseSavedObject }>
  >((acc, updatedCase) => {
    const originalCaseSO = casesMap.get(updatedCase.id);

    if (!originalCaseSO) {
      return acc;
    }

    const alreadyAssignedToCase = originalCaseSO.attributes.assignees;
    const comparedAssignees = arraysDifference(
      alreadyAssignedToCase,
      updatedCase.attributes.assignees ?? []
    );

    if (comparedAssignees && comparedAssignees.addedItems.length > 0) {
      const theCase = mergeOriginalSOWithUpdatedSO(originalCaseSO, updatedCase);

      const assigneesWithoutCurrentUser = comparedAssignees.addedItems.filter(
        (assignee) => assignee.uid !== user.profile_uid
      );

      acc.push({ theCase, assignees: assigneesWithoutCurrentUser });
    }

    return acc;
  }, []);
};

const mergeOriginalSOWithUpdatedSO = (
  originalSO: CaseSavedObject,
  updatedSO: SavedObjectsUpdateResponse<CaseAttributes>
): CaseSavedObject => {
  return {
    ...originalSO,
    ...updatedSO,
    attributes: { ...originalSO.attributes, ...updatedSO?.attributes },
    references: updatedSO.references ?? originalSO.references,
    version: updatedSO?.version ?? updatedSO.version,
  };
};
