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
  KibanaRequest,
  SavedObject,
  SavedObjectsFindResponse,
} from 'kibana/server';

import { CaseClient } from '../../../../client';
import { CASE_COMMENT_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../../../saved_object_types';
import { CaseServiceSetup, CaseUserActionServiceSetup } from '../../../../services';
import {
  CaseStatuses,
  SubCasesPatchRequest,
  SubCasesPatchRequestRt,
  CommentType,
  excess,
  throwErrors,
  SubCasesResponse,
  SubCasePatchRequest,
  SubCaseAttributes,
  ESCaseAttributes,
  SubCaseResponse,
  SubCasesResponseRt,
  User,
  CommentAttributes,
} from '../../../../../common/api';
import { SUB_CASES_PATCH_DEL_URL } from '../../../../../common/constants';
import { RouteDeps } from '../../types';
import {
  AlertInfo,
  escapeHatch,
  flattenSubCaseSavedObject,
  isGenOrAlertCommentAttributes,
  wrapError,
} from '../../utils';
import { getCaseToUpdate } from '../helpers';
import { buildSubCaseUserActions } from '../../../../services/user_actions/helpers';
import { addAlertInfoToStatusMap } from '../../../../common';

interface UpdateArgs {
  client: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  userActionService: CaseUserActionServiceSetup;
  request: KibanaRequest;
  caseClient: CaseClient;
  subCases: SubCasesPatchRequest;
}

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
      `These cases ${conflictedSubCases
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
  client,
  subCaseIDs,
  subCasesMap,
}: {
  caseService: CaseServiceSetup;
  client: SavedObjectsClientContract;
  subCaseIDs: string[];
  subCasesMap: Map<string, SavedObject<SubCaseAttributes>>;
}): Promise<Map<string, SavedObject<ESCaseAttributes>>> {
  const parentIDInfo = getParentIDs({ subCaseIDs, subCasesMap });

  const parentCases = await caseService.getCases({
    client,
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
    subCaseIDsWithParent?.forEach((subCaseID) => {
      acc.set(subCaseID, so);
    });
    return acc;
  }, new Map<string, SavedObject<ESCaseAttributes>>());
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
  client,
}: {
  subCasesToSync: SubCasePatchRequest[];
  caseService: CaseServiceSetup;
  client: SavedObjectsClientContract;
}): Promise<SavedObjectsFindResponse<CommentAttributes>> {
  const ids = subCasesToSync.map((subCase) => subCase.id);
  return caseService.getAllSubCaseComments({
    client,
    id: ids,
    options: {
      filter: `${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.alert} OR ${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.generatedAlert}`,
    },
  });
}

/**
 * Updates the status of alerts for the specified sub cases.
 */
async function updateAlerts({
  subCasesToSync,
  caseService,
  client,
  caseClient,
  subCasesMap,
}: {
  subCasesToSync: SubCasePatchRequest[];
  caseService: CaseServiceSetup;
  client: SavedObjectsClientContract;
  caseClient: CaseClient;
  subCasesMap: Map<string, SavedObject<SubCaseAttributes>>;
}) {
  // get all the alerts for all sub cases that need to be synced
  const totalAlerts = await getAlertComments({ caseService, client, subCasesToSync });
  // create a map of the status (open, closed, etc) to alert info that needs to be updated
  const alertsToUpdate = totalAlerts.saved_objects.reduce((acc, alertComment) => {
    if (isGenOrAlertCommentAttributes(alertComment.attributes)) {
      const id = getID(alertComment);
      const status =
        id !== undefined
          ? subCasesMap.get(id)?.attributes.status ?? CaseStatuses.open
          : CaseStatuses.open;

      addAlertInfoToStatusMap({ comment: alertComment.attributes, statusMap: acc, status });
    }
    return acc;
  }, new Map<CaseStatuses, AlertInfo>());

  // This does at most 3 calls to Elasticsearch to update the status of the alerts to either open, closed, or in-progress
  for (const [status, alertInfo] of alertsToUpdate.entries()) {
    if (alertInfo.ids.length > 0 && alertInfo.indices.size > 0) {
      caseClient.updateAlertsStatus({
        ids: alertInfo.ids,
        status,
        indices: alertInfo.indices,
      });
    }
  }
}

async function update({
  client,
  caseService,
  userActionService,
  request,
  caseClient,
  subCases,
}: UpdateArgs): Promise<SubCasesResponse> {
  const query = pipe(
    excess(SubCasesPatchRequestRt).decode(subCases),
    fold(throwErrors(Boom.badRequest), identity)
  );

  const bulkSubCases = await caseService.getSubCases({
    client,
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
    client,
    caseService,
    subCaseIDs: nonEmptySubCaseRequests.map((subCase) => subCase.id),
    subCasesMap,
  });

  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { username, full_name, email } = await caseService.getUser({ request });
  const updatedAt = new Date().toISOString();
  const updatedCases = await caseService.patchSubCases({
    client,
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
          closed_by: { email, full_name, username },
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
          updated_by: { email, full_name, username },
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
    client,
    caseClient,
    subCasesToSync: subCasesToSyncAlertsFor,
    subCasesMap,
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

  await userActionService.postUserActions({
    client,
    actions: buildSubCaseUserActions({
      originalSubCases: bulkSubCases.saved_objects,
      updatedSubCases: updatedCases.saved_objects,
      actionDate: updatedAt,
      actionBy: { email, full_name, username },
    }),
  });

  return SubCasesResponseRt.encode(returnUpdatedSubCases);
}

export function initPatchSubCasesApi({ router, caseService, userActionService }: RouteDeps) {
  router.patch(
    {
      path: SUB_CASES_PATCH_DEL_URL,
      validate: {
        body: escapeHatch,
      },
    },
    async (context, request, response) => {
      const caseClient = context.case.getCaseClient();
      const subCases = request.body as SubCasesPatchRequest;

      try {
        return response.ok({
          body: await update({
            request,
            subCases,
            caseClient,
            client: context.core.savedObjects.client,
            caseService,
            userActionService,
          }),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
