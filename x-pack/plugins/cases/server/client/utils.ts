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

import { nodeBuilder, fromKueryExpression, KueryNode } from '@kbn/es-query';
import { CASE_SAVED_OBJECT } from '../../common/constants';
import {
  OWNER_FIELD,
  AlertCommentRequestRt,
  ActionsCommentRequestRt,
  CaseStatuses,
  CommentRequest,
  ContextTypeUserRt,
  excess,
  throwErrors,
} from '../../common/api';
import { combineFilterWithAuthorizationFilter } from '../authorization/utils';
import {
  getIDsAndIndicesAsArrays,
  isCommentRequestTypeAlert,
  isCommentRequestTypeUser,
  isCommentRequestTypeActions,
} from '../common/utils';
import { SavedObjectFindOptionsKueryNode } from '../common/types';

export const decodeCommentRequest = (comment: CommentRequest) => {
  if (isCommentRequestTypeUser(comment)) {
    pipe(excess(ContextTypeUserRt).decode(comment), fold(throwErrors(badRequest), identity));
  } else if (isCommentRequestTypeActions(comment)) {
    pipe(excess(ActionsCommentRequestRt).decode(comment), fold(throwErrors(badRequest), identity));
  } else if (isCommentRequestTypeAlert(comment)) {
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
  if (isCommentRequestTypeAlert(comment)) {
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

  return fromKueryExpression(expression);
}

export const constructQueryOptions = ({
  tags,
  reporters,
  status,
  sortByField,
  owner,
  authorizationFilter,
}: {
  tags?: string | string[];
  reporters?: string | string[];
  status?: CaseStatuses;
  sortByField?: string;
  owner?: string | string[];
  authorizationFilter?: KueryNode;
}): SavedObjectFindOptionsKueryNode => {
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

  const statusFilter = status != null ? addStatusFilter({ status }) : undefined;

  const filters: KueryNode[] = [statusFilter, tagsFilter, reportersFilter, ownerFilter].filter(
    kueryNodeExists
  );

  const caseFilters = filters.length > 1 ? nodeBuilder.and(filters) : filters[0];

  return {
    filter: combineFilterWithAuthorizationFilter(caseFilters, authorizationFilter),
    sortField,
  };
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
