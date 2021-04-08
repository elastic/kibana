/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isPlainObject } from 'lodash';
import deepEqual from 'fast-deep-equal';

import { SavedObjectsFindResponse } from 'kibana/server';
import { nodeBuilder, KueryNode } from '../../../../../src/plugins/data/common';
import {
  CaseConnector,
  ESCaseConnector,
  ESCasesConfigureAttributes,
  ConnectorTypeFields,
  ConnectorTypes,
  CaseStatuses,
  CaseType,
  ESConnectorFields,
  CasesClientPostRequest,
  ESCaseAttributes,
  CommentRequest,
} from '../../common/api';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../common/constants';
import { combineFilterWithAuthorizationFilter } from '../authorization/utils';
import { SavedObjectFindOptionsKueryNode } from '../common';
import { isCommentRequestTypeAlertOrGenAlert } from '../routes/api/utils';

/**
 * Return the alert IDs from the comment if it is an alert style comment. Otherwise return an empty array.
 */
export const getAlertIds = (comment: CommentRequest): string[] => {
  if (isCommentRequestTypeAlertOrGenAlert(comment)) {
    return Array.isArray(comment.alertId) ? comment.alertId : [comment.alertId];
  }
  return [];
};

export const transformNewCase = ({
  connector,
  createdDate,
  email,
  // eslint-disable-next-line @typescript-eslint/naming-convention
  full_name,
  newCase,
  username,
}: {
  connector: ESCaseConnector;
  createdDate: string;
  email?: string | null;
  full_name?: string | null;
  newCase: CasesClientPostRequest;
  username?: string | null;
}): ESCaseAttributes => ({
  ...newCase,
  closed_at: null,
  closed_by: null,
  connector,
  created_at: createdDate,
  created_by: { email, full_name, username },
  external_service: null,
  status: CaseStatuses.open,
  updated_at: null,
  updated_by: null,
});

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

export const buildFilter = ({
  filters,
  field,
  operator,
  type = CASE_SAVED_OBJECT,
}: {
  filters: string | string[];
  field: string;
  operator: 'or' | 'and';
  type?: string;
}): KueryNode | null => {
  const filtersAsArray = Array.isArray(filters) ? filters : [filters];

  if (filtersAsArray.length === 0) {
    return null;
  }

  return nodeBuilder[operator](
    filtersAsArray.map((filter) => nodeBuilder.is(`${type}.attributes.${field}`, filter))
  );
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
  const ownerFilter = buildFilter({ filters: owner ?? [], field: 'owner', operator: 'or' });

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
          filter:
            authorizationFilter != null && caseFilters != null
              ? combineFilterWithAuthorizationFilter(caseFilters, authorizationFilter)
              : caseFilters,
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
          filter:
            authorizationFilter != null
              ? combineFilterWithAuthorizationFilter(caseFilters, authorizationFilter)
              : caseFilters,
          sortField,
        },
        subCase: {
          filter:
            authorizationFilter != null && subCaseFilters != null
              ? combineFilterWithAuthorizationFilter(subCaseFilters, authorizationFilter)
              : subCaseFilters,
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
          filter:
            authorizationFilter != null
              ? combineFilterWithAuthorizationFilter(caseFilters, authorizationFilter)
              : caseFilters,
          sortField,
        },
        subCase: {
          filter:
            authorizationFilter != null && subCaseFilters != null
              ? combineFilterWithAuthorizationFilter(subCaseFilters, authorizationFilter)
              : subCaseFilters,
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
