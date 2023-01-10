/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import { get, isPlainObject, differenceWith, isEqual } from 'lodash';
import deepEqual from 'fast-deep-equal';
import { fold } from 'fp-ts/lib/Either';
import { identity } from 'fp-ts/lib/function';
import { pipe } from 'fp-ts/lib/pipeable';

import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder, fromKueryExpression, escapeKuery } from '@kbn/es-query';
import {
  isCommentRequestTypeExternalReference,
  isCommentRequestTypePersistableState,
} from '../../common/utils/attachments';
import { CASE_SAVED_OBJECT, NO_ASSIGNEES_FILTERING_KEYWORD } from '../../common/constants';

import { SEVERITY_EXTERNAL_TO_ESMODEL, STATUS_EXTERNAL_TO_ESMODEL } from '../common/constants';
import type {
  CaseStatuses,
  CommentRequest,
  CaseSeverity,
  CommentRequestExternalReferenceType,
} from '../../common/api';
import {
  OWNER_FIELD,
  AlertCommentRequestRt,
  ActionsCommentRequestRt,
  ContextTypeUserRt,
  excess,
  throwErrors,
  ExternalReferenceStorageType,
  ExternalReferenceSORt,
  ExternalReferenceNoSORt,
  PersistableStateAttachmentRt,
} from '../../common/api';
import { combineFilterWithAuthorizationFilter } from '../authorization/utils';
import {
  getIDsAndIndicesAsArrays,
  isCommentRequestTypeAlert,
  isCommentRequestTypeUser,
  isCommentRequestTypeActions,
  assertUnreachable,
} from '../common/utils';
import type { SavedObjectFindOptionsKueryNode } from '../common/types';
import type { CasesFindQueryParams } from './types';

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
  } else if (isCommentRequestTypeExternalReference(comment)) {
    decodeExternalReferenceAttachment(comment);
  } else if (isCommentRequestTypePersistableState(comment)) {
    pipe(
      excess(PersistableStateAttachmentRt).decode(comment),
      fold(throwErrors(badRequest), identity)
    );
  } else {
    /**
     * This assertion ensures that TS will show an error
     * when we add a new attachment type. This way, we rely on TS
     * to remind us that we have to do a check for the new attachment.
     */
    assertUnreachable(comment);
  }
};

const decodeExternalReferenceAttachment = (attachment: CommentRequestExternalReferenceType) => {
  if (attachment.externalReferenceStorage.type === ExternalReferenceStorageType.savedObject) {
    pipe(excess(ExternalReferenceSORt).decode(attachment), fold(throwErrors(badRequest), identity));
  } else {
    pipe(
      excess(ExternalReferenceNoSORt).decode(attachment),
      fold(throwErrors(badRequest), identity)
    );
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
  filters.push(
    nodeBuilder.is(`${type}.attributes.status`, `${STATUS_EXTERNAL_TO_ESMODEL[status]}`)
  );

  if (appendFilter) {
    filters.push(appendFilter);
  }

  return filters.length > 1 ? nodeBuilder.and(filters) : filters[0];
};

export const addSeverityFilter = ({
  severity,
  appendFilter,
  type = CASE_SAVED_OBJECT,
}: {
  severity: CaseSeverity;
  appendFilter?: KueryNode;
  type?: string;
}): KueryNode => {
  const filters: KueryNode[] = [];

  filters.push(
    nodeBuilder.is(`${type}.attributes.severity`, `${SEVERITY_EXTERNAL_TO_ESMODEL[severity]}`)
  );

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

interface NestedFilterField extends FilterField {
  nestedField: string;
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
    filtersAsArray.map((filter) =>
      nodeBuilder.is(`${escapeKuery(type)}.attributes.${escapeKuery(field)}`, escapeKuery(filter))
    )
  );
};

/**
 * Creates a KueryNode filter for the Saved Object find API's filter field. This handles constructing a filter for
 * a nested field.
 *
 * @param filters is a string or array of strings that defines the values to search for
 * @param field is the location to search for
 * @param nestedField is the field in the saved object that has a type of 'nested'
 * @param operator whether to 'or'/'and' the created filters together
 * @type the type of saved object being searched
 * @returns a constructed KueryNode representing the filter or undefined if one could not be built
 */
export const buildNestedFilter = ({
  filters,
  field,
  nestedField,
  operator,
  type = CASE_SAVED_OBJECT,
}: NestedFilterField): KueryNode | undefined => {
  if (filters === undefined) {
    return;
  }

  const filtersAsArray = Array.isArray(filters) ? filters : [filters];

  if (filtersAsArray.length === 0) {
    return;
  }

  return nodeBuilder[operator](
    filtersAsArray.map((filter) =>
      fromKueryExpression(
        `${escapeKuery(type)}.attributes.${escapeKuery(nestedField)}:{ ${escapeKuery(
          field
        )}: ${escapeKuery(filter)} }`
      )
    )
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

export const buildRangeFilter = ({
  from,
  to,
  field = 'created_at',
  savedObjectType = CASE_SAVED_OBJECT,
}: {
  from?: string;
  to?: string;
  field?: string;
  savedObjectType?: string;
}): KueryNode | undefined => {
  if (from == null && to == null) {
    return;
  }

  try {
    const fromKQL =
      from != null
        ? `${escapeKuery(savedObjectType)}.attributes.${escapeKuery(field)} >= ${escapeKuery(from)}`
        : undefined;
    const toKQL =
      to != null
        ? `${escapeKuery(savedObjectType)}.attributes.${escapeKuery(field)} <= ${escapeKuery(to)}`
        : undefined;

    const rangeKQLQuery = `${fromKQL != null ? fromKQL : ''} ${
      fromKQL != null && toKQL != null ? 'and' : ''
    } ${toKQL != null ? toKQL : ''}`;

    return stringToKueryNode(rangeKQLQuery);
  } catch (error) {
    throw badRequest('Invalid "from" and/or "to" query parameters');
  }
};

export const buildAssigneesFilter = ({
  assignees,
}: {
  assignees: CasesFindQueryParams['assignees'];
}): KueryNode | undefined => {
  if (assignees === undefined) {
    return;
  }

  const assigneesAsArray = Array.isArray(assignees) ? assignees : [assignees];

  if (assigneesAsArray.length === 0) {
    return;
  }

  const assigneesWithoutNone = assigneesAsArray.filter(
    (assignee) => assignee !== NO_ASSIGNEES_FILTERING_KEYWORD
  );
  const hasNoneAssignee = assigneesAsArray.some(
    (assignee) => assignee === NO_ASSIGNEES_FILTERING_KEYWORD
  );

  const assigneesFilter = assigneesWithoutNone.map((filter) =>
    nodeBuilder.is(`${CASE_SAVED_OBJECT}.attributes.assignees.uid`, escapeKuery(filter))
  );

  if (!hasNoneAssignee) {
    return nodeBuilder.or(assigneesFilter);
  }

  const filterCasesWithoutAssigneesKueryNode = fromKueryExpression(
    `not ${CASE_SAVED_OBJECT}.attributes.assignees.uid: *`
  );

  return nodeBuilder.or([...assigneesFilter, filterCasesWithoutAssigneesKueryNode]);
};

export const constructQueryOptions = ({
  tags,
  reporters,
  status,
  severity,
  sortByField,
  owner,
  authorizationFilter,
  from,
  to,
  assignees,
}: CasesFindQueryParams): SavedObjectFindOptionsKueryNode => {
  const tagsFilter = buildFilter({ filters: tags, field: 'tags', operator: 'or' });
  const reportersFilter = createReportersFilter(reporters);
  const sortField = convertSortField(sortByField);
  const ownerFilter = buildFilter({ filters: owner, field: OWNER_FIELD, operator: 'or' });

  const statusFilter = status != null ? addStatusFilter({ status }) : undefined;
  const severityFilter = severity != null ? addSeverityFilter({ severity }) : undefined;
  const rangeFilter = buildRangeFilter({ from, to });
  const assigneesFilter = buildAssigneesFilter({ assignees });

  const filters = combineFilters([
    statusFilter,
    severityFilter,
    tagsFilter,
    reportersFilter,
    rangeFilter,
    ownerFilter,
    assigneesFilter,
  ]);

  return {
    filter: combineFilterWithAuthorizationFilter(filters, authorizationFilter),
    sortField,
  };
};

const createReportersFilter = (reporters?: string | string[]): KueryNode | undefined => {
  const reportersFilter = buildFilter({
    filters: reporters,
    field: 'created_by.username',
    operator: 'or',
  });

  const reportersProfileUidFilter = buildFilter({
    filters: reporters,
    field: 'created_by.profile_uid',
    operator: 'or',
  });

  const filters = [reportersFilter, reportersProfileUidFilter].filter(
    (filter): filter is KueryNode => filter != null
  );

  if (filters.length <= 0) {
    return;
  }

  return nodeBuilder.or(filters);
};

interface CompareArrays<T> {
  addedItems: T[];
  deletedItems: T[];
}

export const arraysDifference = <T>(
  originalValue: T[] | undefined | null,
  updatedValue: T[] | undefined | null
): CompareArrays<T> | null => {
  if (
    originalValue != null &&
    updatedValue != null &&
    Array.isArray(updatedValue) &&
    Array.isArray(originalValue)
  ) {
    const addedItems = differenceWith(updatedValue, originalValue, isEqual);
    const deletedItems = differenceWith(originalValue, updatedValue, isEqual);

    if (addedItems.length > 0 || deletedItems.length > 0) {
      return {
        addedItems,
        deletedItems,
      };
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
        if (arraysDifference(value, currentValue)) {
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
  title = 'title.keyword',
  severity = 'severity',
}

export const convertSortField = (sortField: string | undefined): SortFieldCase => {
  switch (sortField) {
    case 'status':
      return SortFieldCase.status;
    case 'createdAt':
    case 'created_at':
      return SortFieldCase.createdAt;
    case 'closedAt':
    case 'closed_at':
      return SortFieldCase.closedAt;
    case 'title':
      return SortFieldCase.title;
    case 'severity':
      return SortFieldCase.severity;
    default:
      return SortFieldCase.createdAt;
  }
};
