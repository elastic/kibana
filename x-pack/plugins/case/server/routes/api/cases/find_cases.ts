/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from '@hapi/boom';

import { pipe } from 'fp-ts/lib/pipeable';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';

import {
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from 'kibana/server';
import {
  CasesFindResponseRt,
  CasesFindRequestRt,
  throwErrors,
  caseStatuses,
  SubCaseResponse,
  ESCaseAttributes,
  SubCaseAttributes,
  CommentType,
  CaseType,
  SavedObjectFindOptions,
  CaseResponse,
  AssociationType,
} from '../../../../common/api';
import {
  transformCases,
  wrapError,
  escapeHatch,
  flattenSubCaseSavedObject,
  flattenCaseSavedObject,
} from '../utils';
import { RouteDeps } from '../types';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
} from '../../../saved_object_types';
import { CASES_URL } from '../../../../common/constants';
import { CaseServiceSetup } from '../../../services';
import { countAlerts } from '../../../common';
import { constructQueries, findCaseStatusStats } from './helpers';

interface SubCaseStats {
  commentTotals: Map<string, number>;
  alertTotals: Map<string, number>;
}

async function getCaseCommentStats({
  client,
  caseService,
  ids,
  type,
}: {
  client: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  ids: string[];
  type: typeof SUB_CASE_SAVED_OBJECT | typeof CASE_SAVED_OBJECT;
}): Promise<SubCaseStats> {
  const allComments = await Promise.all(
    ids.map((id) =>
      caseService.getAllCaseComments({
        client,
        id,
        subCaseID: type === SUB_CASE_SAVED_OBJECT ? id : undefined,
        options: {
          fields: [],
          page: 1,
          perPage: 1,
        },
      })
    )
  );

  const associationType =
    type === SUB_CASE_SAVED_OBJECT ? AssociationType.subCase : AssociationType.case;

  const alerts = await Promise.all(
    ids.map((id) =>
      caseService.getAllCaseComments({
        client,
        id,
        subCaseID: type === SUB_CASE_SAVED_OBJECT ? id : undefined,
        options: {
          filter: `(${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.alert} OR ${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.generatedAlert}) AND ${CASE_COMMENT_SAVED_OBJECT}.attributes.associationType: ${associationType}`,
        },
      })
    )
  );

  const getID = (comments: SavedObjectsFindResponse<unknown>) => {
    return comments.saved_objects.length > 0
      ? comments.saved_objects[0].references.find((ref) => ref.type === type)?.id
      : undefined;
  };

  const groupedComments = allComments.reduce((acc, comments) => {
    const id = getID(comments);
    if (id) {
      acc.set(id, comments.total);
    }
    return acc;
  }, new Map<string, number>());

  const groupedAlerts = alerts.reduce((acc, alertsInfo) => {
    const id = getID(alertsInfo);
    if (id) {
      const totalAlerts = acc.get(id);
      if (totalAlerts !== undefined) {
        acc.set(id, totalAlerts + countAlerts(alertsInfo));
      }
      acc.set(id, alertsInfo.total);
    }
    return acc;
  }, new Map<string, number>());
  return { commentTotals: groupedComments, alertTotals: groupedAlerts };
}

/**
 * Returns all the sub cases for a set of case IDs. Optionally includes the comment statistics as well.
 */
async function findSubCases({
  client,
  subCaseOptions,
  caseService,
  ids,
}: {
  client: SavedObjectsClientContract;
  subCaseOptions?: SavedObjectFindOptions;
  caseService: CaseServiceSetup;
  ids: string[];
}): Promise<Map<string, SubCaseResponse[]>> {
  const getCaseID = (subCase: SavedObjectsFindResult<SubCaseAttributes>): string | undefined => {
    return subCase.references.length > 0 ? subCase.references[0].id : undefined;
  };

  if (!subCaseOptions) {
    return new Map<string, SubCaseResponse[]>();
  }

  const subCases = await caseService.findSubCases({
    client,
    options: {
      ...subCaseOptions,
      hasReference: ids.map((id) => {
        return {
          id,
          type: SUB_CASE_SAVED_OBJECT,
        };
      }),
    },
  });

  const subCaseComments = await getCaseCommentStats({
    client,
    caseService,
    ids: subCases.saved_objects.map((subCase) => subCase.id),
    type: SUB_CASE_SAVED_OBJECT,
  });

  const subCasesMap = subCases.saved_objects.reduce((accMap, subCase) => {
    const id = getCaseID(subCase);
    if (id) {
      const subCaseFromMap = accMap.get(id);

      if (subCaseFromMap === undefined) {
        const subCasesForID = [
          flattenSubCaseSavedObject({
            savedObject: subCase,
            totalComment: subCaseComments.commentTotals.get(id) ?? 0,
            totalAlerts: subCaseComments.alertTotals.get(id) ?? 0,
          }),
        ];
        accMap.set(id, subCasesForID);
      } else {
        subCaseFromMap.push(
          flattenSubCaseSavedObject({
            savedObject: subCase,
            totalComment: subCaseComments.commentTotals.get(id) ?? 0,
            totalAlerts: subCaseComments.alertTotals.get(id) ?? 0,
          })
        );
      }
    }
    return accMap;
  }, new Map<string, SubCaseResponse[]>());

  return subCasesMap;
}

interface Collection {
  case: SavedObjectsFindResult<ESCaseAttributes>;
  subCases?: SubCaseResponse[];
}

interface CasesMapWithPageInfo {
  casesMap: Map<string, CaseResponse>;
  page: number;
  perPage: number;
}

/**
 * Returns a map of all cases combined with their sub cases if they are collections.
 */
async function findCases({
  client,
  caseOptions,
  subCaseOptions,
  caseService,
  includeEmptyCollections,
}: {
  client: SavedObjectsClientContract;
  caseOptions: SavedObjectFindOptions;
  subCaseOptions?: SavedObjectFindOptions;
  caseService: CaseServiceSetup;
  includeEmptyCollections: boolean;
}): Promise<CasesMapWithPageInfo> {
  const cases = await caseService.findCases({
    client,
    options: caseOptions,
  });

  const subCasesResp = await findSubCases({
    client,
    subCaseOptions,
    caseService,
    ids: cases.saved_objects
      .filter((caseInfo) => caseInfo.type === CaseType.parent)
      .map((caseInfo) => caseInfo.id),
  });
  const casesMap = cases.saved_objects.reduce((accMap, caseInfo) => {
    const subCasesForCase = subCasesResp.get(caseInfo.id);
    /**
     * If we don't have the sub cases for the case and the case is a collection then ignore it
     * unless we're forcing retrieval of empty collections. Otherwise if the case is an individual case
     * then include it.
     */
    if (
      (subCasesForCase && caseInfo.attributes.type === CaseType.parent) ||
      includeEmptyCollections ||
      caseInfo.attributes.type === CaseType.individual
    ) {
      accMap.set(caseInfo.id, { case: caseInfo, subCases: subCasesForCase });
    }
    return accMap;
  }, new Map<string, Collection>());

  /**
   * One potential optimization here is to get all comment stats for individual cases, parent cases, and sub cases
   * in a single request. This can be done because comments that are for sub cases have a reference to both the sub case
   * and the parent. The associationType field allows us to determine which type of case the comment is attached to.
   *
   * So we could use the ids for all the valid cases (individual cases and parents with sub cases) to grab everything.
   * Once we have it we can build the maps.
   *
   * Currently we get all comment stats for all sub cases in one go and we get all comment stats for cases (individual and parent)
   * in another request (the one below this comment).
   */
  const totalCommentsForCases = await getCaseCommentStats({
    client,
    caseService,
    ids: Array.from(casesMap.keys()),
    type: CASE_SAVED_OBJECT,
  });

  const casesWithComments = new Map<string, CaseResponse>();
  for (const [id, caseInfo] of casesMap.entries()) {
    casesWithComments.set(
      id,
      flattenCaseSavedObject({
        savedObject: caseInfo.case,
        totalComment: totalCommentsForCases.commentTotals.get(id) ?? 0,
        totalAlerts: totalCommentsForCases.alertTotals.get(id) ?? 0,
        subCases: caseInfo.subCases,
      })
    );
  }

  return {
    casesMap: casesWithComments,
    page: cases.page,
    perPage: cases.per_page,
  };
}

export function initFindCasesApi({ caseService, caseConfigureService, router }: RouteDeps) {
  router.get(
    {
      path: `${CASES_URL}/_find`,
      validate: {
        query: escapeHatch,
      },
    },
    async (context, request, response) => {
      try {
        const client = context.core.savedObjects.client;
        const queryParams = pipe(
          CasesFindRequestRt.decode(request.query),
          fold(throwErrors(Boom.badRequest), identity)
        );

        const queryArgs = {
          tags: queryParams.tags,
          reporters: queryParams.reporters,
          sortByField: queryParams.sortField,
          status: queryParams.status,
          caseType: queryParams.type,
        };

        const caseQueries = constructQueries(queryArgs);

        const cases = await findCases({
          client,
          caseOptions: { ...queryParams, ...caseQueries.case },
          subCaseOptions: caseQueries.subCase,
          caseService,
          includeEmptyCollections: queryParams.type === CaseType.parent || !queryParams.status,
        });

        const [openCases, inProgressCases, closedCases] = await Promise.all([
          ...caseStatuses.map((status) => {
            const statusQuery = constructQueries({ ...queryArgs, status });
            return findCaseStatusStats({
              client,
              caseOptions: statusQuery.case,
              subCaseOptions: statusQuery.subCase,
              caseService,
            });
          }),
        ]);

        return response.ok({
          body: CasesFindResponseRt.encode(
            transformCases({
              ...cases,
              countOpenCases: openCases,
              countInProgressCases: inProgressCases,
              countClosedCases: closedCases,
              total: cases.casesMap.size,
            })
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
