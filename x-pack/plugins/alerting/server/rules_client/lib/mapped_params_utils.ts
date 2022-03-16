/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { snakeCase } from 'lodash';
import { AlertTypeParams, MappedParams, MappedParamsProperties } from '../../types';
import { SavedObjectAttribute } from '../../../../../../src/core/server';
import {
  iterateFilterKureyNode,
  IterateFilterKureyNodeParams,
  IterateActionProps,
  getFieldNameAttribute,
} from './validate_attributes';

export const MAPPED_PARAMS_PROPERTIES: Array<keyof MappedParamsProperties> = [
  'risk_score',
  'severity',
];

const SEVERITY_MAP: Record<string, string> = {
  low: '20-low',
  medium: '40-medium',
  high: '60-high',
  critical: '80-critical',
};

/**
 * Returns the mapped_params object when given a params object.
 * The function will match params present in MAPPED_PARAMS_PROPERTIES and
 * return an empty object if nothing is matched.
 */
export const getMappedParams = (params: AlertTypeParams) => {
  return Object.entries(params).reduce<MappedParams>((result, [key, value]) => {
    const snakeCaseKey = snakeCase(key);

    if (MAPPED_PARAMS_PROPERTIES.includes(snakeCaseKey as keyof MappedParamsProperties)) {
      result[snakeCaseKey] = getModifiedValue(
        snakeCaseKey,
        value as string
      ) as SavedObjectAttribute;
    }

    return result;
  }, {});
};

/**
 * Returns a string of the filter, but with params replaced with mapped_params.
 * This function will check both camel and snake case to make sure we're consistent
 * with the naming
 *
 * i.e.: 'alerts.attributes.params.riskScore' -> 'alerts.attributes.mapped_params.risk_score'
 */
export const getModifiedFilter = (filter: string) => {
  return filter.replace('.params.', '.mapped_params.');
};

/**
 * Returns modified field with mapped_params instead of params.
 *
 * i.e.: 'params.riskScore' -> 'mapped_params.risk_score'
 */
export const getModifiedField = (field: string | undefined) => {
  if (!field) {
    return field;
  }

  const sortFieldToReplace = `${snakeCase(field.replace('params.', ''))}`;

  if (MAPPED_PARAMS_PROPERTIES.includes(sortFieldToReplace as keyof MappedParamsProperties)) {
    return `mapped_params.${sortFieldToReplace}`;
  }

  return field;
};

/**
 * Returns modified search fields with mapped_params instead of params.
 *
 * i.e.:
 * [
 *    'params.riskScore',
 *    'params.severity',
 * ]
 * ->
 * [
 *    'mapped_params.riskScore',
 *    'mapped_params.severity',
 * ]
 */
export const getModifiedSearchFields = (searchFields: string[] | undefined) => {
  if (!searchFields) {
    return searchFields;
  }

  return searchFields.reduce<string[]>((result, field) => {
    const modifiedField = getModifiedField(field);
    if (modifiedField) {
      return [...result, modifiedField];
    }
    return result;
  }, []);
};

export const getModifiedValue = (key: string, value: string) => {
  if (key === 'severity') {
    return SEVERITY_MAP[value] || '';
  }
  return value;
};

export const getModifiedSearch = (searchFields: string | string[] | undefined, value: string) => {
  if (!searchFields) {
    return value;
  }

  const fieldNames = Array.isArray(searchFields) ? searchFields : [searchFields];

  const modifiedSearchValues = fieldNames.map((fieldName) => {
    const firstAttribute = getFieldNameAttribute(fieldName, [
      'alert',
      'attributes',
      'params',
      'mapped_params',
    ]);
    return getModifiedValue(firstAttribute, value);
  });

  return modifiedSearchValues.find((search) => search !== value) || value;
};

export const modifyFilterKueryNode = ({
  astFilter,
  hasNestedKey = false,
  nestedKeys,
  storeValue,
  path = 'arguments',
}: IterateFilterKureyNodeParams) => {
  const action = ({ index, ast, fieldName, localFieldName }: IterateActionProps) => {
    // First index, assuming ast value is the attribute name
    if (index === 0) {
      const firstAttribute = getFieldNameAttribute(fieldName, ['alert', 'attributes']);
      // Replace the ast.value for params to mapped_params
      if (firstAttribute === 'params') {
        const attributeAfterParams = getFieldNameAttribute(fieldName, [
          'alert',
          'attributes',
          'params',
        ]);
        if (
          MAPPED_PARAMS_PROPERTIES.includes(attributeAfterParams as keyof MappedParamsProperties)
        ) {
          ast.value = getModifiedFilter(ast.value);
        }
      }
    }

    // Subsequent indices, assuming ast value is the filtering value
    else {
      const firstAttribute = getFieldNameAttribute(localFieldName, ['alert', 'attributes']);

      // Replace the ast.value for params value to the modified mapped_params value
      if (firstAttribute === 'params' && ast.value) {
        const attributeAfterParams = getFieldNameAttribute(localFieldName, [
          'alert',
          'attributes',
          'params',
        ]);
        if (
          MAPPED_PARAMS_PROPERTIES.includes(attributeAfterParams as keyof MappedParamsProperties)
        ) {
          ast.value = getModifiedValue(attributeAfterParams, ast.value);
        }
      }
    }
  };

  iterateFilterKureyNode({
    astFilter,
    hasNestedKey,
    nestedKeys,
    storeValue,
    path,
    action,
  });
};
