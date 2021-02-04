/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isPlainObject } from 'lodash';
import deepEqual from 'fast-deep-equal';

import {
  SavedObjectsClientContract,
  SavedObjectsFindResponse,
  SavedObjectsFindResult,
} from 'kibana/server';
import {
  CaseConnector,
  ESCaseConnector,
  ESCasesConfigureAttributes,
  ConnectorTypes,
  CaseStatuses,
  CaseType,
  SavedObjectFindOptions,
  CommentType,
  SubCaseResponse,
  SubCaseAttributes,
  AssociationType,
} from '../../../../common/api';
import { ESConnectorFields, ConnectorTypeFields } from '../../../../common/api/connectors';
import {
  CASE_COMMENT_SAVED_OBJECT,
  CASE_SAVED_OBJECT,
  SUB_CASE_SAVED_OBJECT,
} from '../../../saved_object_types';
import { flattenSubCaseSavedObject, sortToSnake } from '../utils';
import { CaseServiceSetup } from '../../../services';
import { groupTotalAlertsByID } from '../../../common';

// TODO: write unit tests for these functions
export const combineFilters = (filters: string[] | undefined, operator: 'OR' | 'AND'): string => {
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

export const addStatusFilter = ({
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

export const buildFilter = ({
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

/**
 * Calculates the number of sub cases for a given set of options for a set of case IDs.
 */
export const findSubCaseStatusStats = async ({
  client,
  options,
  caseService,
  ids,
}: {
  client: SavedObjectsClientContract;
  options: SavedObjectFindOptions;
  caseService: CaseServiceSetup;
  ids: string[];
}): Promise<number> => {
  const subCases = await caseService.findSubCases({
    client,
    options: {
      ...options,
      page: 1,
      perPage: 1,
      fields: [],
      hasReference: ids.map((id) => {
        return {
          id,
          type: CASE_SAVED_OBJECT,
        };
      }),
    },
  });

  return subCases.total;
};

// TODO: move to the service layer
/**
 * Retrieves the number of cases that exist with a given status (open, closed, etc).
 * This also counts sub cases. Parent cases are excluded from the statistics.
 */
export const findCaseStatusStats = async ({
  client,
  caseOptions,
  caseService,
  subCaseOptions,
}: {
  client: SavedObjectsClientContract;
  caseOptions: SavedObjectFindOptions;
  subCaseOptions?: SavedObjectFindOptions;
  caseService: CaseServiceSetup;
}): Promise<number> => {
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
    .filter((caseInfo) => caseInfo.attributes.type === CaseType.collection)
    .map((caseInfo) => caseInfo.id);

  let subCasesTotal = 0;

  if (subCaseOptions) {
    subCasesTotal = await findSubCaseStatusStats({
      client,
      options: subCaseOptions,
      caseService,
      ids: caseIds,
    });
  }

  const total =
    cases.saved_objects.filter((caseInfo) => caseInfo.attributes.type !== CaseType.collection)
      .length + subCasesTotal;

  return total;
};

interface FindCommentsArgs {
  client: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  id: string | string[];
  associationType: AssociationType;
  options?: SavedObjectFindOptions;
}
export const getComments = async ({
  client,
  caseService,
  id,
  associationType,
  options,
}: FindCommentsArgs) => {
  if (associationType === AssociationType.subCase) {
    return caseService.getAllSubCaseComments({
      client,
      id,
      options,
    });
  } else {
    return caseService.getAllCaseComments({
      client,
      id,
      options,
    });
  }
};

interface SubCaseStats {
  commentTotals: Map<string, number>;
  alertTotals: Map<string, number>;
}

export const getCaseCommentStats = async ({
  client,
  caseService,
  ids,
  associationType,
}: {
  client: SavedObjectsClientContract;
  caseService: CaseServiceSetup;
  ids: string[];
  associationType: AssociationType;
}): Promise<SubCaseStats> => {
  const refType =
    associationType === AssociationType.case ? CASE_SAVED_OBJECT : SUB_CASE_SAVED_OBJECT;

  const allComments = await Promise.all(
    ids.map((id) =>
      getComments({
        client,
        caseService,
        associationType,
        id,
        options: { page: 1, perPage: 1 },
      })
    )
  );

  const alerts = await getComments({
    client,
    caseService,
    associationType,
    id: ids,
    options: {
      filter: `(${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.alert} OR ${CASE_COMMENT_SAVED_OBJECT}.attributes.type: ${CommentType.generatedAlert})`,
    },
  });

  const getID = (comments: SavedObjectsFindResponse<unknown>) => {
    return comments.saved_objects.length > 0
      ? comments.saved_objects[0].references.find((ref) => ref.type === refType)?.id
      : undefined;
  };

  const groupedComments = allComments.reduce((acc, comments) => {
    const id = getID(comments);
    if (id) {
      acc.set(id, comments.total);
    }
    return acc;
  }, new Map<string, number>());

  const groupedAlerts = groupTotalAlertsByID({ comments: alerts });
  return { commentTotals: groupedComments, alertTotals: groupedAlerts };
};

interface SubCasesMapWithPageInfo {
  subCasesMap: Map<string, SubCaseResponse[]>;
  page: number;
  perPage: number;
}

/**
 * Returns all the sub cases for a set of case IDs. Comment statistics are also returned.
 */
export const findSubCases = async ({
  client,
  options,
  caseService,
  ids,
}: {
  client: SavedObjectsClientContract;
  options?: SavedObjectFindOptions;
  caseService: CaseServiceSetup;
  ids: string[];
}): Promise<SubCasesMapWithPageInfo> => {
  const getCaseID = (subCase: SavedObjectsFindResult<SubCaseAttributes>): string | undefined => {
    return subCase.references.length > 0 ? subCase.references[0].id : undefined;
  };

  if (!options) {
    return { subCasesMap: new Map<string, SubCaseResponse[]>(), page: 0, perPage: 0 };
  }

  const subCases = await caseService.findSubCases({
    client,
    options: {
      ...options,
      hasReference: ids.map((id) => {
        return {
          id,
          type: CASE_SAVED_OBJECT,
        };
      }),
    },
  });

  const subCaseComments = await getCaseCommentStats({
    client,
    caseService,
    ids: subCases.saved_objects.map((subCase) => subCase.id),
    associationType: AssociationType.subCase,
  });

  const subCasesMap = subCases.saved_objects.reduce((accMap, subCase) => {
    const parentCaseID = getCaseID(subCase);
    if (parentCaseID) {
      const subCaseFromMap = accMap.get(parentCaseID);

      if (subCaseFromMap === undefined) {
        const subCasesForID = [
          flattenSubCaseSavedObject({
            savedObject: subCase,
            totalComment: subCaseComments.commentTotals.get(subCase.id) ?? 0,
            totalAlerts: subCaseComments.alertTotals.get(subCase.id) ?? 0,
          }),
        ];
        accMap.set(parentCaseID, subCasesForID);
      } else {
        subCaseFromMap.push(
          flattenSubCaseSavedObject({
            savedObject: subCase,
            totalComment: subCaseComments.commentTotals.get(subCase.id) ?? 0,
            totalAlerts: subCaseComments.alertTotals.get(subCase.id) ?? 0,
          })
        );
      }
    }
    return accMap;
  }, new Map<string, SubCaseResponse[]>());

  return { subCasesMap, page: subCases.page, perPage: subCases.per_page };
};

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
export const constructQueries = ({
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
}): { case: SavedObjectFindOptions; subCase?: SavedObjectFindOptions } => {
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
    case CaseType.collection: {
      // The cases filter will result in this structure "(type == parent) and (tags == blah) and (reporter == yo)"
      // The sub case filter will use the query.status if it exists
      const typeFilter = `${CASE_SAVED_OBJECT}.attributes.type: ${CaseType.collection}`;
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
      const typeParent = `${CASE_SAVED_OBJECT}.attributes.type: ${CaseType.collection}`;

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
};

interface CompareArrays {
  addedItems: string[];
  deletedItems: string[];
}
export const compareArrays = ({
  originalValue,
  updatedValue,
}: {
  originalValue: string[];
  updatedValue: string[];
}): CompareArrays => {
  const result: CompareArrays = {
    addedItems: [],
    deletedItems: [],
  };
  originalValue.forEach((origVal) => {
    if (!updatedValue.includes(origVal)) {
      result.deletedItems = [...result.deletedItems, origVal];
    }
  });
  updatedValue.forEach((updatedVal) => {
    if (!originalValue.includes(updatedVal)) {
      result.addedItems = [...result.addedItems, updatedVal];
    }
  });

  return result;
};

export const isTwoArraysDifference = (
  originalValue: unknown,
  updatedValue: unknown
): CompareArrays | null => {
  if (
    originalValue != null &&
    updatedValue != null &&
    Array.isArray(updatedValue) &&
    Array.isArray(originalValue)
  ) {
    const compObj = compareArrays({ originalValue, updatedValue });
    if (compObj.addedItems.length > 0 || compObj.deletedItems.length > 0) {
      return compObj;
    }
  }
  return null;
};

// TODO: rename
interface Versioned {
  id: string;
  version: string;
  [key: string]: unknown;
}

export const getCaseToUpdate = (currentCase: unknown, queryCase: Versioned): Versioned =>
  Object.entries(queryCase).reduce(
    (acc, [key, value]) => {
      const currentValue = get(currentCase, key);
      if (Array.isArray(currentValue) && Array.isArray(value)) {
        if (isTwoArraysDifference(value, currentValue)) {
          return {
            ...acc,
            [key]: value,
          };
        }
        return acc;
      } else if (isPlainObject(currentValue) && isPlainObject(value)) {
        if (!deepEqual(currentValue, value)) {
          return {
            ...acc,
            [key]: value,
          };
        }

        return acc;
      } else if (currentValue != null && value !== currentValue) {
        return {
          ...acc,
          [key]: value,
        };
      }
      return acc;
    },
    { id: queryCase.id, version: queryCase.version }
  );

export const getNoneCaseConnector = () => ({
  id: 'none',
  name: 'none',
  type: ConnectorTypes.none,
  fields: null,
});

export const getConnectorFromConfiguration = (
  caseConfigure: SavedObjectsFindResponse<ESCasesConfigureAttributes>
): CaseConnector => {
  let caseConnector = getNoneCaseConnector();
  if (
    caseConfigure.saved_objects.length > 0 &&
    caseConfigure.saved_objects[0].attributes.connector
  ) {
    caseConnector = {
      id: caseConfigure.saved_objects[0].attributes.connector.id,
      name: caseConfigure.saved_objects[0].attributes.connector.name,
      type: caseConfigure.saved_objects[0].attributes.connector.type,
      fields: null,
    };
  }
  return caseConnector;
};

export const transformCaseConnectorToEsConnector = (connector: CaseConnector): ESCaseConnector => ({
  id: connector?.id ?? 'none',
  name: connector?.name ?? 'none',
  type: connector?.type ?? '.none',
  fields:
    connector?.fields != null
      ? Object.entries(connector.fields).reduce<ESConnectorFields>(
          (acc, [key, value]) => [
            ...acc,
            {
              key,
              value,
            },
          ],
          []
        )
      : [],
});

export const transformESConnectorToCaseConnector = (connector?: ESCaseConnector): CaseConnector => {
  const connectorTypeField = {
    type: connector?.type ?? '.none',
    fields:
      connector && connector.fields != null && connector.fields.length > 0
        ? connector.fields.reduce(
            (fields, { key, value }) => ({
              ...fields,
              [key]: value,
            }),
            {}
          )
        : null,
  } as ConnectorTypeFields;

  return {
    id: connector?.id ?? 'none',
    name: connector?.name ?? 'none',
    ...connectorTypeField,
  };
};
