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
  CaseStatuses,
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
  sortToSnake,
  wrapError,
  escapeHatch,
  flattenSubCaseSavedObject,
  flattenCaseSavedObject,
} from '../utils';
import { RouteDeps } from '../types';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../../saved_object_types';
import { CASES_URL } from '../../../../common/constants';
import { CaseServiceSetup } from '../../../services';
import { countAlerts } from '../../../common';

const combineFilters = (filters: string[], operator: 'OR' | 'AND'): string =>
  filters?.filter((i) => i !== '').join(` ${operator} `);

const addStatusFilter = ({
  status,
  appendFilter,
  type = CASE_SAVED_OBJECT,
}: {
  status: CaseStatuses | undefined;
  appendFilter?: string;
  type?: string;
}) => {
  const filters: string[] = [];
  if (status) {
    filters.push(`${type}.attributes.status: ${status}`);
  }

  if (appendFilter) {
    filters.push(appendFilter);
  }
  return combineFilters(filters, 'AND');
};

const buildFilter = ({
  filters,
  field,
  operator,
  type = CASE_SAVED_OBJECT,
}: {
  filters: string | string[] | undefined;
  field: string;
  operator: 'OR' | 'AND';
  type?: string;
}): string =>
  filters != null && filters.length > 0
    ? Array.isArray(filters)
      ? // Be aware of the surrounding parenthesis (as string inside literal) around filters.
        `(${filters
          .map((filter) => `${type}.attributes.${field}: ${filter}`)
          ?.join(` ${operator} `)})`
      : `${type}.attributes.${field}: ${filters}`
    : '';

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
          filter: `(${type}.attributes.type: ${CommentType.alert} OR ${type}.attributes.type: ${CommentType.generatedAlert}) AND ${type}.attributes.associationType: ${associationType}`,
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
 * Constructs the filters used for finding cases and sub cases.
 * There are a few scenarios that this function tries to handle when constructing the filters used for finding cases
 * and sub cases.
 *
 * Scenario 1:
 *  Type == Individual
 *  If the API request specifies that it wants only individual cases (aka not collections) then we need to add that
 *  specific filter when call the saved objects find api. This will filter out any collection cases.
 *
 * Scenario 2:
 *  Type == collection
 *  If the API request specifies that it only wants collection cases (cases that have sub cases) then we need to add
 *  the filter for collections AND we need to ignore any status filter for the case find call. This is because a
 *  collection's status is no longer relevant when it has sub cases. The user cannot change the status for a collection
 *  only for its sub cases. The status filter will be applied to the find request when looking for sub cases.
 *
 * Scenario 3:
 *  No Type is specified
 *  If the API request does not want to filter on type but instead get both collections and regular individual cases then
 *  we need to find all cases that match the other filter criteria and sub cases. To do this we construct the following query:
 *
 *    ((status == some_status and type === individual) or type == collection) and (tags == blah) and (reporter == yo)
 *  This forces us to honor the status request for individual cases but gets us ALL collection cases that match the other
 *  filter criteria. When we search for sub cases we will use that status filter in that find call as well.
 */
function constructQueries({
  tags,
  reporters,
  status,
  sortByField,
  caseType,
}: {
  tags?: string | string[];
  reporters?: string | string[];
  status?: CaseStatuses;
  sortByField?: string;
  caseType?: CaseType;
}): { case: SavedObjectFindOptions; subCase?: SavedObjectFindOptions } {
  const tagsFilter = buildFilter({ filters: tags, field: 'tags', operator: 'OR' });
  const reportersFilter = buildFilter({
    filters: reporters,
    field: 'created_by.username',
    operator: 'OR',
  });
  const sortField = sortToSnake(sortByField);

  switch (caseType) {
    case CaseType.individual: {
      // The cases filter will result in this structure "status === oh and (type === individual) and (tags === blah) and (reporter === yo)"
      // The subCase filter will be undefined because we don't need to find sub cases if type === individual

      // We do not want to support multiple type's being used, so force it to be a single filter value
      const typeFilter = `${CASE_SAVED_OBJECT}.attributes.type: ${CaseType.individual}`;
      const caseFilters = addStatusFilter({
        status,
        appendFilter: combineFilters([tagsFilter, reportersFilter, typeFilter], 'AND'),
      });
      return {
        case: {
          filter: caseFilters,
          sortField,
        },
      };
    }
    case CaseType.parent: {
      // The cases filter will result in this structure "(type == parent) and (tags == blah) and (reporter == yo)"
      // The sub case filter will use the query.status if it exists
      const typeFilter = `${CASE_SAVED_OBJECT}.attributes.type: ${CaseType.parent}`;
      const caseFilters = combineFilters([tagsFilter, reportersFilter, typeFilter], 'AND');

      return {
        case: {
          filter: caseFilters,
          sortField,
        },
        subCase: {
          filter: addStatusFilter({ status, type: SUB_CASE_SAVED_OBJECT }),
          sortField,
        },
      };
    }
    default: {
      /**
       * In this scenario no type filter was sent, so we want to honor the status filter if one exists.
       * To construct the filter and honor the status portion we need to find all individual cases that
       * have that particular status. We also need to find cases that have sub cases but we want to ignore the
       * case collection's status because it is not relevant. We only care about the status of the sub cases if the
       * case is a collection.
       *
       * The cases filter will result in this structure "((status == open and type === individual) or type == parent) and (tags == blah) and (reporter == yo)"
       * The sub case filter will use the query.status if it exists
       */
      const typeIndividual = `${CASE_SAVED_OBJECT}.attributes.type: ${CaseType.individual}`;
      const statusFilter = combineFilters([addStatusFilter({ status }), typeIndividual], 'AND');
      const typeFilter = `${CASE_SAVED_OBJECT}.attributes.type: ${CaseType.parent}`;
      const statusAndType = combineFilters([statusFilter, typeFilter], 'OR');
      const caseFilters = combineFilters([statusAndType, tagsFilter, reportersFilter], 'AND');

      return {
        case: {
          filter: caseFilters,
          sortField,
        },
        subCase: {
          filter: addStatusFilter({ status, type: SUB_CASE_SAVED_OBJECT }),
          sortField,
        },
      };
    }
  }
}

/**
 * Returns all the sub cases for a set of case IDs. Optionally includes the comment statistics as well.
 */
async function findSubCases({
  client,
  subCaseOptions,
  caseService,
  ids,
  includeCommentsStats,
}: {
  client: SavedObjectsClientContract;
  subCaseOptions?: SavedObjectFindOptions;
  caseService: CaseServiceSetup;
  ids: string[];
  includeCommentsStats: boolean;
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

  let subCaseComments: SubCaseStats = {
    commentTotals: new Map(),
    alertTotals: new Map(),
  };

  if (includeCommentsStats) {
    subCaseComments = await getCaseCommentStats({
      client,
      caseService,
      ids: subCases.saved_objects.map((subCase) => subCase.id),
      type: SUB_CASE_SAVED_OBJECT,
    });
  }

  return subCases.saved_objects.reduce((accMap, subCase) => {
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
 * Returns a map of all cases combined with their sub cases if they are collections and
 * optionally includes the statistics for the cases' comments.
 *
 * @param includeEmptyCollections is a flag for whether to include collections that don't
 *  have any sub cases
 */
async function findCases({
  client,
  caseOptions,
  subCaseOptions,
  caseService,
  includeEmptyCollections,
  includeCommentsStats,
}: {
  client: SavedObjectsClientContract;
  caseOptions: SavedObjectFindOptions;
  subCaseOptions?: SavedObjectFindOptions;
  caseService: CaseServiceSetup;
  includeEmptyCollections: boolean;
  includeCommentsStats: boolean;
}): Promise<CasesMapWithPageInfo> {
  const cases = await caseService.findCases({
    client,
    options: caseOptions,
  });

  const subCases = await findSubCases({
    client,
    subCaseOptions,
    caseService,
    ids: cases.saved_objects.map((caseInfo) => caseInfo.id),
    includeCommentsStats,
  });
  const casesMap = cases.saved_objects.reduce((accMap, caseInfo) => {
    const subCasesForCase = subCases.get(caseInfo.id);
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

  let totalCommentsForCases: SubCaseStats = {
    commentTotals: new Map(),
    alertTotals: new Map(),
  };

  if (includeCommentsStats) {
    totalCommentsForCases = await getCaseCommentStats({
      client,
      caseService,
      ids: Array.from(casesMap.keys()),
      type: CASE_SAVED_OBJECT,
    });
  }

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

        const [cases, openCases, inProgressCases, closedCases] = await Promise.all([
          findCases({
            client,
            caseOptions: { ...queryParams, ...caseQueries.case },
            subCaseOptions: caseQueries.subCase,
            caseService,
            includeEmptyCollections: queryParams.type === CaseType.parent || !queryParams.status,
            includeCommentsStats: true,
          }),
          ...caseStatuses.map((status) => {
            // TODO: maybe clean this up
            const statusQuery = constructQueries({ ...queryArgs, status });
            return findCases({
              client,
              caseOptions: {
                ...statusQuery.case,
                fields: ['attributes.type'],
                page: 1,
                perPage: 1,
              },
              subCaseOptions: statusQuery.subCase,
              caseService,
              includeEmptyCollections: false,
              // we don't need the comment stats because we're just trying to get the total open, closed, and in-progress
              // cases
              includeCommentsStats: false,
            });
          }),
        ]);

        return response.ok({
          body: CasesFindResponseRt.encode(
            transformCases({
              ...cases,
              countOpenCases: openCases.casesMap.size,
              countInProgressCases: inProgressCases.casesMap.size,
              countClosedCases: closedCases.casesMap.size,
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
