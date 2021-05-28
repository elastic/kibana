/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { get, isPlainObject } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import { SavedObjectsFindResponse } from 'kibana/server';
import { nodeBuilder, KueryNode } from '../../../../../src/plugins/data/common';
import { esKuery } from '../../../../../src/plugins/data/server';
import {
  CaseConnector,
  ESCasesConfigureAttributes,
  ConnectorTypes,
  CaseStatuses,
  CaseType,
  CommentRequest,
  throwErrors,
  excess,
  ContextTypeUserRt,
  AlertCommentRequestRt,
  OWNER_FIELD,
} from '../../common/api';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../common/constants';
import { combineFilterWithAuthorizationFilter } from '../authorization/utils';
import {
  getIDsAndIndicesAsArrays,
  isCommentRequestTypeAlertOrGenAlert,
  isCommentRequestTypeUser,
  SavedObjectFindOptionsKueryNode,
} from '../common';

export const decodeCommentRequest = (comment: CommentRequest) => {
  if (isCommentRequestTypeUser(comment)) {
    pipe(excess(ContextTypeUserRt).decode(comment), fold(throwErrors(badRequest), identity));
  } else if (isCommentRequestTypeAlertOrGenAlert(comment)) {
    pipe(excess(AlertCommentRequestRt).decode(comment), fold(throwErrors(badRequest), identity));
    const { ids, indices } = getIDsAndIndicesAsArrays(comment);

    /**
     * The alertId and index field must either be both of type string or they must both be string[] and be the same length.
     * Having a one-to-one relationship between the id and index of an alert avoids accidentally updating or
     * retrieving the wrong alert. Elasticsearch only guarantees that the _id (the field we use for alertId) to be
     * unique within a single index. So if we attempt to update or get a specific alert across multiple indices we could
     * update or receive the wrong one.
     *
     * Consider the situation where we have a alert1 with _id = '100' in index 'my-index-awesome' and also in index
     *  'my-index-hi'.
     * If we attempt to update the status of alert1 using an index pattern like `my-index-*` or even providing multiple
     * indices, there's a chance we'll accidentally update too many alerts.
     *
     * This check doesn't enforce that the API request has the correct alert ID to index relationship it just guards
     * against accidentally making a request like:
     * {
     *  alertId: [1,2,3],
     *  index: awesome,
     * }
     *
     * Instead this requires the requestor to provide:
     * {
     *  alertId: [1,2,3],
     *  index: [awesome, awesome, awesome]
     * }
     *
     * Ideally we'd change the format of the comment request to be an array of objects like:
     * {
     *  alerts: [{id: 1, index: awesome}, {id: 2, index: awesome}]
     * }
     *
     * But we'd need to also implement a migration because the saved object document currently stores the id and index
     * in separate fields.
     */
    if (ids.length !== indices.length) {
      throw badRequest(
        `Received an alert comment with ids and indices arrays of different lengths ids: ${JSON.stringify(
          ids
        )} indices: ${JSON.stringify(indices)}`
      );
    }
  }
};

/**
 * Return the alert IDs from the comment if it is an alert style comment. Otherwise return an empty array.
 */
export const getAlertIds = (comment: CommentRequest): string[] => {
  if (isCommentRequestTypeAlertOrGenAlert(comment)) {
    return Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
  }
  return [];
};

export const addStatusFilter = ({
  status,
  appendFilter,
  type = CASE_SAVED_OBJECT,
}: {
  status: CaseStatuses;
  appendFilter?: KueryNode;
  type?: string;
}): KueryNode => {
  const filters: KueryNode[] = [];
  filters.push(nodeBuilder.is(`${type}.attributes.status`, status));

  if (appendFilter) {
    filters.push(appendFilter);
  }

  return filters.length > 1 ? nodeBuilder.and(filters) : filters[0];
};

interface FilterField {
  filters?: string | string[];
  field: string;
  operator: 'and' | 'or';
  type?: string;
}

export const buildFilter = ({
  filters,
  field,
  operator,
  type = CASE_SAVED_OBJECT,
}: FilterField): KueryNode | undefined => {
  if (filters === undefined) {
    return;
  }

  const filtersAsArray = Array.isArray(filters) ? filters : [filters];

  if (filtersAsArray.length === 0) {
    return;
  }

  return nodeBuilder[operator](
    filtersAsArray.map((filter) => nodeBuilder.is(`${type}.attributes.${field}`, filter))
  );
};

/**
 * Combines the authorized filters with the requested owners.
 */
export const combineAuthorizedAndOwnerFilter = (
  owner?: string[] | string,
  authorizationFilter?: KueryNode,
  savedObjectType?: string
): KueryNode | undefined => {
  const ownerFilter = buildFilter({
    filters: owner,
    field: OWNER_FIELD,
    operator: 'or',
    type: savedObjectType,
  });

  return combineFilterWithAuthorizationFilter(ownerFilter, authorizationFilter);
};

/**
 * Combines Kuery nodes and accepts an array with a mixture of undefined and KueryNodes. This will filter out the undefined
 * filters and return a KueryNode with the filters and'd together.
 */
export function combineFilters(nodes: Array<KueryNode | undefined>): KueryNode | undefined {
  const filters = nodes.filter((node): node is KueryNode => node !== undefined);
  if (filters.length <= 0) {
    return;
  }
  return nodeBuilder.and(filters);
}

/**
 * Creates a KueryNode from a string expression. Returns undefined if the expression is undefined.
 */
export function stringToKueryNode(expression?: string): KueryNode | undefined {
  if (!expression) {
    return;
  }

  return esKuery.fromKueryExpression(expression);
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
export const constructQueryOptions = ({
  tags,
  reporters,
  status,
  sortByField,
  caseType,
  owner,
  authorizationFilter,
}: {
  tags?: string | string[];
  reporters?: string | string[];
  status?: CaseStatuses;
  sortByField?: string;
  caseType?: CaseType;
  owner?: string | string[];
  authorizationFilter?: KueryNode;
}): { case: SavedObjectFindOptionsKueryNode; subCase?: SavedObjectFindOptionsKueryNode } => {
  const kueryNodeExists = (filter: KueryNode | null | undefined): filter is KueryNode =>
    filter != null;

  const tagsFilter = buildFilter({ filters: tags ?? [], field: 'tags', operator: 'or' });
  const reportersFilter = buildFilter({
    filters: reporters ?? [],
    field: 'created_by.username',
    operator: 'or',
  });
  const sortField = sortToSnake(sortByField);
  const ownerFilter = buildFilter({ filters: owner ?? [], field: OWNER_FIELD, operator: 'or' });

  switch (caseType) {
    case CaseType.individual: {
      // The cases filter will result in this structure "status === oh and (type === individual) and (tags === blah) and (reporter === yo)"
      // The subCase filter will be undefined because we don't need to find sub cases if type === individual

      // We do not want to support multiple type's being used, so force it to be a single filter value
      const typeFilter = nodeBuilder.is(
        `${CASE_SAVED_OBJECT}.attributes.type`,
        CaseType.individual
      );

      const filters: KueryNode[] = [typeFilter, tagsFilter, reportersFilter, ownerFilter].filter(
        kueryNodeExists
      );

      const caseFilters =
        status != null
          ? addStatusFilter({
              status,
              appendFilter: filters.length > 1 ? nodeBuilder.and(filters) : filters[0],
            })
          : undefined;

      return {
        case: {
          filter: combineFilterWithAuthorizationFilter(caseFilters, authorizationFilter),
          sortField,
        },
      };
    }
    case CaseType.collection: {
      // The cases filter will result in this structure "(type == parent) and (tags == blah) and (reporter == yo)"
      // The sub case filter will use the query.status if it exists
      const typeFilter = nodeBuilder.is(
        `${CASE_SAVED_OBJECT}.attributes.type`,
        CaseType.collection
      );

      const filters: KueryNode[] = [typeFilter, tagsFilter, reportersFilter, ownerFilter].filter(
        kueryNodeExists
      );
      const caseFilters = filters.length > 1 ? nodeBuilder.and(filters) : filters[0];
      const subCaseFilters =
        status != null ? addStatusFilter({ status, type: SUB_CASE_SAVED_OBJECT }) : undefined;

      return {
        case: {
          filter: combineFilterWithAuthorizationFilter(caseFilters, authorizationFilter),
          sortField,
        },
        subCase: {
          filter: combineFilterWithAuthorizationFilter(subCaseFilters, authorizationFilter),
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
      const typeIndividual = nodeBuilder.is(
        `${CASE_SAVED_OBJECT}.attributes.type`,
        CaseType.individual
      );
      const typeParent = nodeBuilder.is(
        `${CASE_SAVED_OBJECT}.attributes.type`,
        CaseType.collection
      );

      const statusFilter =
        status != null
          ? nodeBuilder.and([addStatusFilter({ status }), typeIndividual])
          : typeIndividual;
      const statusAndType = nodeBuilder.or([statusFilter, typeParent]);

      const filters: KueryNode[] = [statusAndType, tagsFilter, reportersFilter, ownerFilter].filter(
        kueryNodeExists
      );

      const caseFilters = filters.length > 1 ? nodeBuilder.and(filters) : filters[0];
      const subCaseFilters =
        status != null ? addStatusFilter({ status, type: SUB_CASE_SAVED_OBJECT }) : undefined;

      return {
        case: {
          filter: combineFilterWithAuthorizationFilter(caseFilters, authorizationFilter),
          sortField,
        },
        subCase: {
          filter: combineFilterWithAuthorizationFilter(subCaseFilters, authorizationFilter),
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

interface CaseWithIDVersion {
  id: string;
  version: string;
  [key: string]: unknown;
}

export const getCaseToUpdate = (
  currentCase: unknown,
  queryCase: CaseWithIDVersion
): CaseWithIDVersion =>
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

enum SortFieldCase {
  closedAt = 'closed_at',
  createdAt = 'created_at',
  status = 'status',
}

export const sortToSnake = (sortField: string | undefined): SortFieldCase => {
  switch (sortField) {
    case 'status':
      return SortFieldCase.status;
    case 'createdAt':
    case 'created_at':
      return SortFieldCase.createdAt;
    case 'closedAt':
    case 'closed_at':
      return SortFieldCase.closedAt;
    default:
      return SortFieldCase.createdAt;
  }
};
