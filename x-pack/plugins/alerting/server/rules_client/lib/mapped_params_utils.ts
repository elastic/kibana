/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { camelCase, snakeCase } from 'lodash';
import { AlertTypeParams, MappedParams } from '../../types';
import { SavedObjectAttribute } from '../../../../../../src/core/server';

const FILTER_PARAMS_PREFIX = 'alert.attributes';

export const MAPPED_PARAMS_PROPERTIES = ['risk_score', 'severity'];

/**
 * Returns the mapped_params object when given a params object.
 * The function will match params present in MAPPED_PARAMS_PROPERTIES and
 * return an empty object is nothing is matched.
 */
export const getMappedParams = (params: AlertTypeParams) => {
  return Object.keys(params).reduce<MappedParams>((result, key) => {
    const snakeCaseKey = snakeCase(key);

    if (MAPPED_PARAMS_PROPERTIES.includes(snakeCaseKey)) {
      result[snakeCaseKey] = params[key] as SavedObjectAttribute;
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
export const getModifiedFilter = (filter: string | undefined) => {
  if (!filter) {
    return filter;
  }

  return MAPPED_PARAMS_PROPERTIES.reduce((result, key) => {
    const camelCaseParamsFilter = `${FILTER_PARAMS_PREFIX}.params.${snakeCase(key)}`;
    const snakeCaseParamsFilter = `${FILTER_PARAMS_PREFIX}.params.${camelCase(key)}`;
    const mappedParamsFilter = `${FILTER_PARAMS_PREFIX}.mapped_params.${key}`;

    result = result.replace(camelCaseParamsFilter, mappedParamsFilter);
    result = result.replace(snakeCaseParamsFilter, mappedParamsFilter);
    return result;
  }, filter);
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

  if (MAPPED_PARAMS_PROPERTIES.includes(sortFieldToReplace)) {
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
