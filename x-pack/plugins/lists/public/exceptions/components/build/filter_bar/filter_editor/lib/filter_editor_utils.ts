/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */

/* eslint-disable func-style */

import dateMath from '@kbn/datemath';
import { Filter } from '@kbn/es-query';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import isSemverValid from 'semver/functions/valid';
import { IpAddress, isFilterable } from '@kbn/data-plugin/common';
import type { DataView, DataViewField } from '@kbn/data-views-plugin/common';

import { Operator } from './filter_operators';

export function getFieldFromFilter(filter: Filter, indexPattern?: DataView) {
  return indexPattern?.fields.find((field) => field.name === filter.meta.key);
}

export function getOperatorFromFilter(filter: Filter, operators: Operator[]) {
  console.log('getOperatorFromFilter', { operators, filter });
  return operators.find((operator) => {
    return filter.meta.type === operator.type && filter.meta.negate === operator.negate;
  });
}

export function getFilterableFields(indexPattern: DataView) {
  return indexPattern.fields.filter(isFilterable);
}

export function getOperatorOptions(field: DataViewField, operators: Operator[]) {
  console.log('getOperatorOptions', { field, operators });
  return operators.filter((operator) => {
    if (operator.field) return operator.field(field);
    if (operator.fieldTypes) return operator.fieldTypes.includes(field.type);
    return true;
  });
}

export function validateParams(params: any, field: DataViewField) {
  switch (field?.type) {
    case 'date':
      const moment = typeof params === 'string' ? dateMath.parse(params) : null;
      return Boolean(typeof params === 'string' && moment && moment.isValid());
    case 'ip':
      try {
        return Boolean(new IpAddress(params));
      } catch (e) {
        return false;
      }
    case 'string':
      if (field.esTypes?.includes(ES_FIELD_TYPES.VERSION)) {
        return isSemverValid(params);
      }
      return true;
    case 'boolean':
      return typeof params === 'boolean';
    default:
      return true;
  }
}

export function isFilterValid(
  indexPattern?: DataView,
  field?: DataViewField,
  operator?: Operator,
  params?: any
) {
  console.log({ operator, params });
  if (!indexPattern || !field || !operator) {
    return false;
  }

  switch (operator.type) {
    case 'phrase':
    case 'wildcard':
      return validateParams(params, field);
    case 'phrases':
      if (!Array.isArray(params) || !params.length) {
        return false;
      }
      return params.every((phrase) => validateParams(phrase, field));
    case 'range':
      if (typeof params !== 'object') {
        return false;
      }
      return (
        (!params.from || validateParams(params.from, field)) &&
        (!params.to || validateParams(params.to, field))
      );
    case 'exists':
      return true;
    default:
      throw new Error(`Unknown operator type: ${operator.type}`);
  }
}
