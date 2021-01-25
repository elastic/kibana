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
  SavedObject,
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from 'kibana/server';
import { groupBy } from 'lodash';
import {
  CasesFindResponseRt,
  CasesFindRequestRt,
  throwErrors,
  CaseStatuses,
  caseStatuses,
  CasesFindRequest,
  SubCaseResponse,
  ESCaseAttributes,
  SubCaseAttributes,
  CommentType,
  CommentAttributes,
} from '../../../../common/api';
import { transformCases, sortToSnake, wrapError, escapeHatch } from '../utils';
import { RouteDeps, TotalCommentByCase } from '../types';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../../saved_object_types';
import { CASES_URL } from '../../../../common/constants';
import { CaseServiceSetup } from '../../../services';

const combineFilters = (filters: string[], operator: 'OR' | 'AND'): string =>
  filters?.filter((i) => i !== '').join(` ${operator} `);

// TODO: make this pass in the saved object name string
const addStatusFilter = (status: CaseStatuses | undefined, appendFilter?: string) => {
  const filters: string[] = [];
  if (status) {
    filters.push(`${CASE_SAVED_OBJECT}.attributes.status: ${status}`);
  }

  if (appendFilter) {
    filters.push(appendFilter);
  }
  return combineFilters(filters, 'AND');
};

const buildFilter = (
  filters: string | string[] | undefined,
  field: string,
  operator: 'OR' | 'AND'
): string =>
  filters != null && filters.length > 0
    ? Array.isArray(filters)
      ? // Be aware of the surrounding parenthesis (as string inside literal) around filters.
        `(${filters
          .map((filter) => `${CASE_SAVED_OBJECT}.attributes.${field}: ${filter}`)
          ?.join(` ${operator} `)})`
      : `${CASE_SAVED_OBJECT}.attributes.${field}: ${filters}`
    : '';

interface SubCaseStats {
  commentTotals: Map<string, number>;
  alertTotals: Map<string, number>;
}

async function getSubCaseCommentStats({
  client,
  caseService,
  ids,
}: {
  client: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  ids: string[];
}): Promise<SubCaseStats> {
  const allComments = await Promise.all(
    ids.map((id) =>
      caseService.getAllCaseComments({
        client,
        id,
        options: {
          fields: [],
          page: 1,
          perPage: 1,
        },
      })
    )
  );

  const alerts = await Promise.all(
    ids.map((id) =>
      caseService.getAllCaseComments({
        client,
        id,
        options: {
          page: 1,
          // TODO: fix this
          perPage: 10000,
          filter: `${SUB_CASE_SAVED_OBJECT}.attributes.type: ${CommentType.alert} OR ${SUB_CASE_SAVED_OBJECT}.attributes.type: ${CommentType.alertGroup}`,
        },
      })
    )
  );

  const getID = (comments: SavedObjectsFindResponse<unknown>) => {
    return comments.saved_objects.length > 0
      ? comments.saved_objects[0].references.find((ref) => ref.type === SUB_CASE_SAVED_OBJECT)?.id
      : undefined;
  };

  const countAlerts = (comments: SavedObjectsFindResponse<CommentAttributes>) => {
    let totalAlerts = 0;
    for (const comment of comments.saved_objects) {
      if (
        comment.attributes.type === CommentType.alert ||
        comment.attributes.type === CommentType.alertGroup
      ) {
        if (Array.isArray(comment.attributes.alertId)) {
          totalAlerts += comment.attributes.alertId.length;
        } else {
          totalAlerts++;
        }
      }
    }
    return totalAlerts;
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

async function findSubCases({
  client,
  caseService,
  query,
  filtersWithoutStatus,
  filteredCases,
}: {
  client: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  query: CasesFindRequest;
  filtersWithoutStatus: string;
  filteredCases: SavedObjectsFindResponse<ESCaseAttributes>;
}): SavedObjectsFindResponse<SubCaseResponse> {
  const ids = [...filteredCases.saved_objects.map((caseInfo) => caseInfo.id)];
  const cases: Map<string, SavedObjectsFindResult<ESCaseAttributes>> = new Map(
    filteredCases.saved_objects.map((caseInfo) => {
      return [caseInfo.id, caseInfo];
    })
  );

  if (query.status) {
    // TODO: count the total comments for these cases
    const casesWithoutStatusFilter = await caseService.findCases({
      client,
      options: {
        ...query,
        filter: filtersWithoutStatus,
        sortField: sortToSnake(query.sortField ?? ''),
      },
    });
    ids.push(...casesWithoutStatusFilter.saved_objects.map((so) => so.id));

    for (const caseInfo of casesWithoutStatusFilter.saved_objects) {
      cases.set(caseInfo.id, caseInfo);
    }
  }

  // TODO: count the totals for open, closed, and in-progress sub cases
  const foundSubCases = await caseService.findSubCases({
    client,
    options: {
      filter: addStatusFilter(query.status),
      hasReference: ids.map((id) => {
        return {
          id,
          type: SUB_CASE_SAVED_OBJECT,
        };
      }),
    },
  });

  const subCasesComments = await getSubCaseCommentStats({
    client,
    caseService,
    ids: foundSubCases.saved_objects.map((so) => so.id),
  });

  const caseCollections = new Map<
    string,
    {
      subCases?: Array<SavedObjectsFindResult<SubCaseAttributes>>;
      caseInfo: SavedObjectsFindResult;
    }
  >(
    filteredCases.saved_objects.map((caseInfo) => {
      return [caseInfo.id, { caseInfo }];
    })
  );

  const getCaseID = (subCase: SavedObjectsFindResult<SubCaseAttributes>): string | undefined => {
    return subCase.references.length > 0 ? subCase.references[0].id : undefined;
  };

  const subCasesGroupedByCaseID = groupBy(foundSubCases.saved_objects, getCaseID);

  for (const [id, subCases] of Object.entries(subCasesGroupedByCaseID)) {
    const caseInfo = cases.get(id);
    if (caseInfo) {
      caseCollections.set(id, { caseInfo, subCases });
    }
  }

  // TODO: merge sub cases and new found cases together with comment stats?
  return caseCollections;
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

        const { tags, reporters, status, ...query } = queryParams;
        const tagsFilter = buildFilter(tags, 'tags', 'OR');
        const reportersFilters = buildFilter(reporters, 'created_by.username', 'OR');

        const myFilters = combineFilters([tagsFilter, reportersFilters], 'AND');
        const filter = addStatusFilter(status, myFilters);

        // TODO: I think this is a bug, queryParams will always be defined
        const args = queryParams
          ? {
              client,
              options: {
                ...query,
                filter,
                sortField: sortToSnake(query.sortField ?? ''),
              },
            }
          : {
              client,
            };

        const statusArgs = caseStatuses.map((caseStatus) => ({
          client,
          options: {
            fields: [],
            page: 1,
            perPage: 1,
            filter: addStatusFilter(caseStatus, myFilters),
          },
        }));

        const [cases, openCases, inProgressCases, closedCases] = await Promise.all([
          caseService.findCases(args),
          ...statusArgs.map((arg) => caseService.findCases(arg)),
        ]);

        const totalCommentsFindByCases = await Promise.all(
          cases.saved_objects.map((c) =>
            caseService.getAllCaseComments({
              client,
              id: c.id,
              options: {
                fields: [],
                page: 1,
                perPage: 1,
              },
            })
          )
        );

        const totalCommentsByCases = totalCommentsFindByCases.reduce<TotalCommentByCase[]>(
          (acc, itemFind) => {
            if (itemFind.saved_objects.length > 0) {
              const caseId = itemFind.saved_objects[0].references.find(
                (r) => r.type === CASE_SAVED_OBJECT
              )?.id;
              if (caseId) {
                return [...acc, { caseId, totalComments: itemFind.total }];
              }
            }
            return [...acc];
          },
          []
        );

        return response.ok({
          body: CasesFindResponseRt.encode(
            transformCases(
              cases,
              openCases.total ?? 0,
              inProgressCases.total ?? 0,
              closedCases.total ?? 0,
              totalCommentsByCases
            )
          ),
        });
      } catch (error) {
        return response.customError(wrapError(error));
      }
    }
  );
}
