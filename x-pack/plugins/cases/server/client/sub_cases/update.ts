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
  SavedObjectsClientContract,
  SavedObject,
  SavedObjectsFindResponse,
  Logger,
} from 'kibana/server';

import { nodeBuilder } from '../../../../../../src/plugins/data/common';
import { CasesService } from '../../services';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CaseStatuses,
  CommentAttributes,
  CommentType,
  excess,
  SUB_CASE_SAVED_OBJECT,
  SubCaseAttributes,
  SubCasePatchRequest,
  SubCaseResponse,
  SubCasesPatchRequest,
  SubCasesPatchRequestRt,
  SubCasesResponse,
  SubCasesResponseRt,
  throwErrors,
  User,
  CaseAttributes,
} from '../../../common';
import { getCaseToUpdate } from '../utils';
import { buildSubCaseUserActions } from '../../services/user_actions/helpers';
import {
  createAlertUpdateRequest,
  createCaseError,
  isCommentRequestTypeAlertOrGenAlert,
  flattenSubCaseSavedObject,
} from '../../common';
import { UpdateAlertRequest } from '../../client/alerts/types';
import { CasesClientArgs } from '../types';
import { CasesClientInternal } from '../client_internal';

function checkNonExistingOrConflict(
  toUpdate: SubCasePatchRequest[],
  fromStorage: Map<string, SavedObject<SubCaseAttributes>>
) {
  const nonExistingSubCases: SubCasePatchRequest[] = [];
  const conflictedSubCases: SubCasePatchRequest[] = [];
  for (const subCaseToUpdate of toUpdate) {
    const bulkEntry = fromStorage.get(subCaseToUpdate.id);

    if (bulkEntry && bulkEntry.error) {
      nonExistingSubCases.push(subCaseToUpdate);
    }

    if (!bulkEntry || bulkEntry.version !== subCaseToUpdate.version) {
      conflictedSubCases.push(subCaseToUpdate);
    }
  }

  if (nonExistingSubCases.length > 0) {
    throw Boom.notFound(
      `These sub cases ${nonExistingSubCases
        .map((c) => c.id)
        .join(', ')} do not exist. Please check you have the correct ids.`
    );
  }

  if (conflictedSubCases.length > 0) {
    throw Boom.conflict(
      `These sub cases ${conflictedSubCases
        .map((c) => c.id)
        .join(', ')} has been updated. Please refresh before saving additional updates.`
    );
  }
}

interface GetParentIDsResult {
  ids: string[];
  parentIDToSubID: Map<string, string[]>;
}

function getParentIDs({
  subCasesMap,
  subCaseIDs,
}: {
  subCasesMap: Map<string, SavedObject<SubCaseAttributes>>;
  subCaseIDs: string[];
}): GetParentIDsResult {
  return subCaseIDs.reduce<GetParentIDsResult>(
    (acc, id) => {
      const subCase = subCasesMap.get(id);
      if (subCase && subCase.references.length > 0) {
        const parentID = subCase.references[0].id;
        acc.ids.push(parentID);
        let subIDs = acc.parentIDToSubID.get(parentID);
        if (subIDs === undefined) {
          subIDs = [];
        }
        subIDs.push(id);
        acc.parentIDToSubID.set(parentID, subIDs);
      }
      return acc;
    },
    { ids: [], parentIDToSubID: new Map<string, string[]>() }
  );
}

async function getParentCases({
  caseService,
  unsecuredSavedObjectsClient,
  subCaseIDs,
  subCasesMap,
}: {
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  subCaseIDs: string[];
  subCasesMap: Map<string, SavedObject<SubCaseAttributes>>;
}): Promise<Map<string, SavedObject<CaseAttributes>>> {
  const parentIDInfo = getParentIDs({ subCaseIDs, subCasesMap });

  const parentCases = await caseService.getCases({
    unsecuredSavedObjectsClient,
    caseIds: parentIDInfo.ids,
  });

  const parentCaseErrors = parentCases.saved_objects.filter((so) => so.error !== undefined);

  if (parentCaseErrors.length > 0) {
    throw Boom.badRequest(
      `Unable to find parent cases: ${parentCaseErrors
        .map((c) => c.id)
        .join(', ')} for sub cases: ${subCaseIDs.join(', ')}`
    );
  }

  return parentCases.saved_objects.reduce((acc, so) => {
    const subCaseIDsWithParent = parentIDInfo.parentIDToSubID.get(so.id);
    subCaseIDsWithParent?.forEach((subCaseId) => {
      acc.set(subCaseId, so);
    });
    return acc;
  }, new Map<string, SavedObject<CaseAttributes>>());
}

function getValidUpdateRequests(
  toUpdate: SubCasePatchRequest[],
  subCasesMap: Map<string, SavedObject<SubCaseAttributes>>
): SubCasePatchRequest[] {
  const validatedSubCaseAttributes: SubCasePatchRequest[] = toUpdate.map((updateCase) => {
    const currentCase = subCasesMap.get(updateCase.id);
    return currentCase != null
      ? getCaseToUpdate(currentCase.attributes, {
          ...updateCase,
        })
      : { id: updateCase.id, version: updateCase.version };
  });

  return validatedSubCaseAttributes.filter((updateCase: SubCasePatchRequest) => {
    const { id, version, ...updateCaseAttributes } = updateCase;
    return Object.keys(updateCaseAttributes).length > 0;
  });
}

/**
 * Get the id from a reference in a comment for a sub case
 */
function getID(comment: SavedObject<CommentAttributes>): string | undefined {
  return comment.references.find((ref) => ref.type === SUB_CASE_SAVED_OBJECT)?.id;
}

/**
 * Get all the alert comments for a set of sub cases
 */
async function getAlertComments({
  subCasesToSync,
  caseService,
  unsecuredSavedObjectsClient,
}: {
  subCasesToSync: SubCasePatchRequest[];
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
}): Promise<SavedObjectsFindResponse<CommentAttributes>> {
  const ids = subCasesToSync.map((subCase) => subCase.id);
  return caseService.getAllSubCaseComments({
    unsecuredSavedObjectsClient,
    id: ids,
    options: {
      filter: nodeBuilder.or([
        nodeBuilder.is(`${CASE_COMMENT_SAVED_OBJECT}.attributes.type`, CommentType.alert),
        nodeBuilder.is(`${CASE_COMMENT_SAVED_OBJECT}.attributes.type`, CommentType.generatedAlert),
      ]),
    },
  });
}

/**
 * Updates the status of alerts for the specified sub cases.
 */
async function updateAlerts({
  caseService,
  unsecuredSavedObjectsClient,
  casesClientInternal,
  logger,
  subCasesToSync,
}: {
  caseService: CasesService;
  unsecuredSavedObjectsClient: SavedObjectsClientContract;
  casesClientInternal: CasesClientInternal;
  logger: Logger;
  subCasesToSync: SubCasePatchRequest[];
}) {
  try {
    const subCasesToSyncMap = subCasesToSync.reduce((acc, subCase) => {
      acc.set(subCase.id, subCase);
      return acc;
    }, new Map<string, SubCasePatchRequest>());
    // get all the alerts for all sub cases that need to be synced
    const totalAlerts = await getAlertComments({
      caseService,
      unsecuredSavedObjectsClient,
      subCasesToSync,
    });
    // create a map of the status (open, closed, etc) to alert info that needs to be updated
    const alertsToUpdate = totalAlerts.saved_objects.reduce(
      (acc: UpdateAlertRequest[], alertComment) => {
        if (isCommentRequestTypeAlertOrGenAlert(alertComment.attributes)) {
          const id = getID(alertComment);
          const status =
            id !== undefined
              ? subCasesToSyncMap.get(id)?.status ?? CaseStatuses.open
              : CaseStatuses.open;

          acc.push(...createAlertUpdateRequest({ comment: alertComment.attributes, status }));
        }
        return acc;
      },
      []
    );

    await casesClientInternal.alerts.updateStatus({ alerts: alertsToUpdate });
  } catch (error) {
    throw createCaseError({
      message: `Failed to update alert status while updating sub cases: ${JSON.stringify(
        subCasesToSync
      )}: ${error}`,
      logger,
      error,
    });
  }
}

/**
 * Handles updating the fields in a sub case.
 */
export async function update({
  subCases,
  clientArgs,
  casesClientInternal,
}: {
  subCases: SubCasesPatchRequest;
  clientArgs: CasesClientArgs;
  casesClientInternal: CasesClientInternal;
}): Promise<SubCasesResponse> {
  const query = pipe(
    excess(SubCasesPatchRequestRt).decode(subCases),
    fold(throwErrors(Boom.badRequest), identity)
  );

  try {
    const { unsecuredSavedObjectsClient, user, caseService, userActionService } = clientArgs;

    const bulkSubCases = await caseService.getSubCases({
      unsecuredSavedObjectsClient,
      ids: query.subCases.map((q) => q.id),
    });

    const subCasesMap = bulkSubCases.saved_objects.reduce((acc, so) => {
      acc.set(so.id, so);
      return acc;
    }, new Map<string, SavedObject<SubCaseAttributes>>());

    checkNonExistingOrConflict(query.subCases, subCasesMap);

    const nonEmptySubCaseRequests = getValidUpdateRequests(query.subCases, subCasesMap);

    if (nonEmptySubCaseRequests.length <= 0) {
      throw Boom.notAcceptable('All update fields are identical to current version.');
    }

    const subIDToParentCase = await getParentCases({
      unsecuredSavedObjectsClient,
      caseService,
      subCaseIDs: nonEmptySubCaseRequests.map((subCase) => subCase.id),
      subCasesMap,
    });

    const updatedAt = new Date().toISOString();
    const updatedCases = await caseService.patchSubCases({
      unsecuredSavedObjectsClient,
      subCases: nonEmptySubCaseRequests.map((thisCase) => {
        const { id: subCaseId, version, ...updateSubCaseAttributes } = thisCase;
        let closedInfo: { closed_at: string | null; closed_by: User | null } = {
          closed_at: null,
          closed_by: null,
        };

        if (
          updateSubCaseAttributes.status &&
          updateSubCaseAttributes.status === CaseStatuses.closed
        ) {
          closedInfo = {
            closed_at: updatedAt,
            closed_by: user,
          };
        } else if (
          updateSubCaseAttributes.status &&
          (updateSubCaseAttributes.status === CaseStatuses.open ||
            updateSubCaseAttributes.status === CaseStatuses['in-progress'])
        ) {
          closedInfo = {
            closed_at: null,
            closed_by: null,
          };
        }
        return {
          subCaseId,
          updatedAttributes: {
            ...updateSubCaseAttributes,
            ...closedInfo,
            updated_at: updatedAt,
            updated_by: user,
          },
          version,
        };
      }),
    });

    const subCasesToSyncAlertsFor = nonEmptySubCaseRequests.filter((subCaseToUpdate) => {
      const storedSubCase = subCasesMap.get(subCaseToUpdate.id);
      const parentCase = subIDToParentCase.get(subCaseToUpdate.id);
      return (
        storedSubCase !== undefined &&
        subCaseToUpdate.status !== undefined &&
        storedSubCase.attributes.status !== subCaseToUpdate.status &&
        parentCase?.attributes.settings.syncAlerts
      );
    });

    await updateAlerts({
      caseService,
      unsecuredSavedObjectsClient,
      casesClientInternal,
      subCasesToSync: subCasesToSyncAlertsFor,
      logger: clientArgs.logger,
    });

    const returnUpdatedSubCases = updatedCases.saved_objects.reduce<SubCaseResponse[]>(
      (acc, updatedSO) => {
        const originalSubCase = subCasesMap.get(updatedSO.id);
        if (originalSubCase) {
          acc.push(
            flattenSubCaseSavedObject({
              savedObject: {
                ...originalSubCase,
                ...updatedSO,
                attributes: { ...originalSubCase.attributes, ...updatedSO.attributes },
                references: originalSubCase.references,
                version: updatedSO.version ?? originalSubCase.version,
              },
            })
          );
        }
        return acc;
      },
      []
    );

    await userActionService.bulkCreate({
      unsecuredSavedObjectsClient,
      actions: buildSubCaseUserActions({
        originalSubCases: bulkSubCases.saved_objects,
        updatedSubCases: updatedCases.saved_objects,
        actionDate: updatedAt,
        actionBy: user,
      }),
    });

    return SubCasesResponseRt.encode(returnUpdatedSubCases);
  } catch (error) {
    const idVersions = query.subCases.map((subCase) => ({
      id: subCase.id,
      version: subCase.version,
    }));
    throw createCaseError({
      message: `Failed to update sub cases: ${JSON.stringify(idVersions)}: ${error}`,
      error,
      logger: clientArgs.logger,
    });
  }
}
