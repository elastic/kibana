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
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
} from '../../../saved_object_types';
import { CASES_URL } from '../../../../common/constants';
import { CaseServiceSetup } from '../../../services';
import { countAlerts } from '../../../common';

// TODO: write unit tests for these functions
const combineFilters = (filters: string[] | undefined, operator: 'OR' | 'AND'): string => {
  const noEmptyStrings = filters?.filter((value) => value !== '');
  const joinedExp = noEmptyStrings?.join(` ${operator} `);
  // if undefined or an empty string
  if (!joinedExp) {
    return '';
  } else if ((noEmptyStrings?.length ?? 0) > 1) {
    // if there were multiple filters, wrap them in ()
    return `(${joinedExp})`;
  } else {
    // return a single value not wrapped in ()
    return joinedExp;
  }
};

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
}): string => {
  // if it is an empty string, empty array of strings, or undefined just return
  if (!filters || filters.length <= 0) {
    return '';
  }

  const arrayFilters = !Array.isArray(filters) ? [filters] : filters;

  return combineFilters(
    arrayFilters.map((filter) => `${type}.attributes.${field}: ${filter}`),
    operator
  );
};

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
      const typeParent = `${CASE_SAVED_OBJECT}.attributes.type: ${CaseType.parent}`;

      const statusFilter = combineFilters([addStatusFilter({ status }), typeIndividual], 'AND');
      const statusAndType = combineFilters([statusFilter, typeParent], 'OR');
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
    ids: cases.saved_objects.map((caseInfo) => caseInfo.id),
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

// TODO: move to the service layer
/**
 *
 */
async function findCaseStatusStats({
  client,
  caseOptions,
  caseService,
  subCaseOptions,
}: {
  client: SavedObjectsClientContract;
  caseOptions: SavedObjectFindOptions;
  subCaseOptions?: SavedObjectFindOptions;
  caseService: CaseServiceSetup;
}): Promise<number> {
  // TODO: move the double calls to the service layer?
  const casesStats = await caseService.findCases({
    client,
    options: {
      ...caseOptions,
      fields: [],
      page: 1,
      perPage: 1,
    },
  });

  /**
   * This could be made more performant. What we're doing here is retrieving all cases
   * that match the API request's filters instead of just counts. This is because we need to grab
   * the ids for the parent cases that match those filters. Then we use those IDS to count how many
   * sub cases those parents have to calculate the total amount of cases that are open, closed, or in-progress.
   *
   * Another solution would be to store ALL filterable fields on both a case and sub case. That we could do a single
   * query for each type to calculate the totals using the filters. This has drawbacks though:
   *
   * We'd have to sync up the parent case's editable attributes with the sub case any time they were change to avoid
   * them getting out of sync and causing issues when we do these types of stats aggregations. This would result in a lot
   * of update requests if the user is editing their case details often. Which could potentially cause conflict failures.
   *
   * Another option is to prevent the ability from update the parent case's details all together once it's created. A user
   * could instead modify the sub case details directly. This could be weird though because individual sub cases for the same
   * parent would have different titles, tags, etc.
   *
   * Another potential issue with this approach is when you push a case and all its sub case information. If the sub cases
   * don't have the same title and tags, we'd need to account for that as well.
   */
  const cases = await caseService.findCases({
    client,
    options: {
      ...caseOptions,
      // TODO: move this to a variable that the cases spec uses to define the field
      fields: ['type'],
      page: 1,
      perPage: casesStats.total,
    },
  });

  const caseIds = cases.saved_objects
    .filter((caseInfo) => caseInfo.attributes.type === CaseType.parent)
    .map((caseInfo) => caseInfo.id);

  const subCases = await caseService.findSubCases({
    client,
    options: {
      ...subCaseOptions,
      page: 1,
      perPage: 1,
      fields: [],
      hasReference: caseIds.map((id) => {
        return {
          id,
          type: SUB_CASE_SAVED_OBJECT,
        };
      }),
    },
  });

  const total =
    cases.saved_objects.filter((caseInfo) => caseInfo.attributes.type !== CaseType.parent).length +
    subCases.total;

  return total;
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
