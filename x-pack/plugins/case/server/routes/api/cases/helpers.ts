/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, isPlainObject } from 'lodash';
import deepEqual from 'fast-deep-equal';

import { SavedObjectsFindResponse } from 'kibana/server';
import {
  CaseConnector,
  ESCaseConnector,
  ESCaseAttributes,
  ESCasePatchRequest,
  ESCasesConfigureAttributes,
  ConnectorTypes,
} from '../../../../common/api';
import { ESConnectorFields, ConnectorTypeFields } from '../../../../common/api/connectors';

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
