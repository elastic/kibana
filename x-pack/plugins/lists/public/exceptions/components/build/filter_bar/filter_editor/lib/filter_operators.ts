/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/explicit-function-return-type */

/* eslint-disable sort-keys */

import { i18n } from '@kbn/i18n';
import { FILTERS } from '@kbn/es-query';
import { ES_FIELD_TYPES, KBN_FIELD_TYPES, castEsToKbnFieldTypeName } from '@kbn/field-types';
import { DataViewField } from '@kbn/data-views-plugin/common';

export const strings = {
  getIsOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isOperatorOptionLabel', {
      defaultMessage: 'is',
    }),
  getIsNotOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isNotOperatorOptionLabel', {
      defaultMessage: 'is not',
    }),
  getIsOneOfOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isOneOfOperatorOptionLabel', {
      defaultMessage: 'is one of',
    }),
  getIsNotOneOfOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isNotOneOfOperatorOptionLabel', {
      defaultMessage: 'is not one of',
    }),
  getIsBetweenOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isBetweenOperatorOptionLabel', {
      defaultMessage: 'is between',
    }),
  getIsNotBetweenOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.isNotBetweenOperatorOptionLabel', {
      defaultMessage: 'is not between',
    }),
  getExistsOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.existsOperatorOptionLabel', {
      defaultMessage: 'exists',
    }),
  getDoesNotExistOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.doesNotExistOperatorOptionLabel', {
      defaultMessage: 'does not exist',
    }),
  getWildcardOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.wildcardOperatorOptionLabel', {
      defaultMessage: 'matches',
    }),
  getNotWildcardOperatorOptionLabel: () =>
    i18n.translate('unifiedSearch.filter.filterEditor.notWildcardOperatorOptionLabel', {
      defaultMessage: 'does not match',
    }),
};

export interface Operator {
  message: string;
  type: FILTERS;
  negate: boolean;

  /**
   * KbnFieldTypes applicable for operator
   */
  fieldTypes?: string[];

  /**
   * A filter predicate for a field,
   * takes precedence over {@link fieldTypes}
   */
  field?: (field: DataViewField) => boolean;
}

export const isOperator = {
  message: strings.getIsOperatorOptionLabel(),
  type: FILTERS.PHRASE,
  negate: false,
};

export const isNotOperator = {
  message: strings.getIsNotOperatorOptionLabel(),
  type: FILTERS.PHRASE,
  negate: true,
};

export const isOneOfOperator = {
  message: strings.getIsOneOfOperatorOptionLabel(),
  type: FILTERS.PHRASES,
  negate: false,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
};

export const isNotOneOfOperator = {
  message: strings.getIsNotOneOfOperatorOptionLabel(),
  type: FILTERS.PHRASES,
  negate: true,
  fieldTypes: ['string', 'number', 'date', 'ip', 'geo_point', 'geo_shape'],
};

export const isBetweenOperator = {
  message: strings.getIsBetweenOperatorOptionLabel(),
  type: FILTERS.RANGE,
  negate: false,
  field: (field: DataViewField) => {
    if (['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'].includes(field.type))
      return true;

    if (field.type === 'string' && field.esTypes?.includes(ES_FIELD_TYPES.VERSION)) return true;

    return false;
  },
};

export const isNotBetweenOperator = {
  message: strings.getIsNotBetweenOperatorOptionLabel(),
  type: FILTERS.RANGE,
  negate: true,
  field: (field: DataViewField) => {
    if (['number', 'number_range', 'date', 'date_range', 'ip', 'ip_range'].includes(field.type))
      return true;

    if (field.type === 'string' && field.esTypes?.includes(ES_FIELD_TYPES.VERSION)) return true;

    return false;
  },
};

export const existsOperator = {
  message: strings.getExistsOperatorOptionLabel(),
  type: FILTERS.EXISTS,
  negate: false,
};

export const doesNotExistOperator = {
  message: strings.getDoesNotExistOperatorOptionLabel(),
  type: FILTERS.EXISTS,
  negate: true,
};

export const isKibanaStringType = (type: string) => {
  const kbnFieldType = castEsToKbnFieldTypeName(type);
  return kbnFieldType === KBN_FIELD_TYPES.STRING;
};

export const isWildcardOperator = {
  message: strings.getWildcardOperatorOptionLabel(),
  type: FILTERS.WILDCARD,
  negate: false,
  field: (field: DataViewField) => {
    if (['string'].includes(field.type) || field.esTypes?.some(isKibanaStringType)) {
      return true;
    }

    return false;
  },
};

export const isNotWildcardOperator = {
  message: strings.getNotWildcardOperatorOptionLabel(),
  type: FILTERS.WILDCARD,
  negate: true,
  field: (field: DataViewField) => {
    if (['string'].includes(field.type) || field.esTypes?.some(isKibanaStringType)) {
      return true;
    }

    return false;
  },
};

export const FILTER_OPERATORS: Operator[] = [
  isOperator,
  isNotOperator,
  isOneOfOperator,
  isNotOneOfOperator,
  isBetweenOperator,
  isNotBetweenOperator,
  existsOperator,
  doesNotExistOperator,
  isWildcardOperator,
  isNotWildcardOperator,
];
