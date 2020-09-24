/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isPlainObject } from 'lodash';
import deepEqual from 'fast-deep-equal';

import { SavedObjectsFindResponse } from 'kibana/server';
import {
  CasesConfigureAttributes,
  CaseConnector,
  ESCaseConnector,
  ESCaseAttributes,
  ESCasePatchRequest,
} from '../../../../common/api';

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

export const getCaseToUpdate = (
  currentCase: ESCaseAttributes,
  queryCase: ESCasePatchRequest
): ESCasePatchRequest =>
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
      } else if (currentValue == null && key === 'connector' && value !== currentValue) {
        return {
          ...acc,
          [key]: value,
        };
      }
      return acc;
    },
    { id: queryCase.id, version: queryCase.version }
  );

export const getConnectorFromConfiguration = (
  caseConfigure: SavedObjectsFindResponse<CasesConfigureAttributes>
): CaseConnector => ({
  id:
    caseConfigure.saved_objects.length > 0
      ? caseConfigure.saved_objects[0].attributes.connector.id
      : 'none',
  name:
    caseConfigure.saved_objects.length > 0
      ? caseConfigure.saved_objects[0].attributes.connector.name
      : 'none',
  type:
    caseConfigure.saved_objects.length > 0
      ? caseConfigure.saved_objects[0].attributes.connector.type
      : '.none',
  fields: {},
});

export const transformCaseConnectorToEsConnector = (connector: CaseConnector): ESCaseConnector => ({
  id: connector.id,
  name: connector.name,
  type: connector.type,
  fields: Object.keys(connector.fields).map((fieldKey) => ({
    key: fieldKey,
    value: connector.fields[fieldKey],
  })),
});

export const transformESConnectorToCaseConnector = (connector: ESCaseConnector): CaseConnector => ({
  id: connector.id,
  name: connector.name,
  type: connector.type,
  fields: connector.fields.reduce(
    (fields, field) => ({
      ...fields,
      [field.key]: field.value,
    }),
    {}
  ),
});
