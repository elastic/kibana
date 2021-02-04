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

import { SavedObjectsClientContract, SavedObjectsFindResult } from 'kibana/server';
import {
  CasesFindResponseRt,
  CasesFindRequestRt,
  throwErrors,
  caseStatuses,
  SubCaseResponse,
  ESCaseAttributes,
  CaseType,
  SavedObjectFindOptions,
  CaseResponse,
  AssociationType,
} from '../../../../common/api';
import { transformCases, wrapError, escapeHatch, flattenCaseSavedObject } from '../utils';
import { RouteDeps } from '../types';
import { CASES_URL } from '../../../../common/constants';
import { CaseServiceSetup } from '../../../services';
import {
  constructQueries,
  findCaseStatusStats,
  findSubCases,
  getCaseCommentStats,
} from './helpers';

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
}: {
  client: SavedObjectsClientContract;
  caseOptions: SavedObjectFindOptions;
  subCaseOptions?: SavedObjectFindOptions;
  caseService: CaseServiceSetup;
}): Promise<CasesMapWithPageInfo> {
  const cases = await caseService.findCases({
    client,
    options: caseOptions,
  });

  const subCasesResp = await findSubCases({
    client,
    options: subCaseOptions,
    caseService,
    ids: cases.saved_objects
      .filter((caseInfo) => caseInfo.type === CaseType.collection)
      .map((caseInfo) => caseInfo.id),
  });
  const casesMap = cases.saved_objects.reduce((accMap, caseInfo) => {
    const subCasesForCase = subCasesResp.subCasesMap.get(caseInfo.id);

    /**
     * This will include empty collections unless the query explicitly requested type === CaseType.individual, in which
     * case we'd not have any collections anyway.
     */
    accMap.set(caseInfo.id, { case: caseInfo, subCases: subCasesForCase });
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
    associationType: AssociationType.case,
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
