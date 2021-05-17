/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isPlainObject } from 'lodash';
import deepEqual from 'fast-deep-equal';

import { SavedObjectsFindResponse } from 'kibana/server';
import {
  CaseConnector,
  CaseStatuses,
  CaseType,
  ConnectorTypeFields,
  ConnectorTypes,
  ESCaseConnector,
  ESCasesConfigureAttributes,
  ESConnectorFields,
  SavedObjectFindOptions,
} from '../../../../common';
import { CASE_SAVED_OBJECT, SUB_CASE_SAVED_OBJECT } from '../../../saved_object_types';
import { sortToSnake } from '../utils';
import { combineFilters } from '../../../common';

export const addStatusFilter = ({
  status,
  appendFilter,
  type = CASE_SAVED_OBJECT,
}: {
  status?: CaseStatuses;
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
