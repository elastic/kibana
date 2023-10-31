/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import dateMath from '@kbn/datemath';
import isSemverValid from 'semver/functions/valid';
import { IpAddress } from '@kbn/data-plugin/common';
import { ES_FIELD_TYPES } from '@kbn/field-types';
import type { DataViewField } from '@kbn/data-views-plugin/public';
import type { Provider } from './use_insight_data_providers';

export function validateProvider(
  dataViewField: DataViewField,
  value?: string | number | boolean,
  valueType?: string
): boolean {
  if (value === undefined || valueType === 'undefined') {
    return false;
  }

  const fieldType = dataViewField.type;
  switch (fieldType) {
    case 'date':
      const moment = typeof value === 'string' ? dateMath.parse(value) : null;
      return Boolean(typeof value === 'string' && moment && moment.isValid());
    case 'ip':
      if (typeof value === 'string' || typeof value === 'number') {
        try {
          return Boolean(new IpAddress(value));
        } catch (e) {
          return false;
        }
      }
      return false;
    case 'string':
      if (typeof value === 'string' && dataViewField.esTypes?.includes(ES_FIELD_TYPES.VERSION)) {
        return Boolean(isSemverValid(value));
      }
      return typeof value === 'string' && value.trim().length > 0;
    case 'boolean':
      return typeof value === 'boolean';
    case 'number':
      return typeof value === 'number' || (typeof value === 'string' && !isNaN(parseFloat(value)));
    default:
      return true;
  }
}

export function isProviderValid(provider: Provider, dataViewField?: DataViewField): boolean {
  if (!dataViewField || !provider.field) {
    return false;
  }

  switch (provider.queryType) {
    case 'phrase':
      return validateProvider(dataViewField, provider.value, provider.valueType);
    case 'phrases':
      const phraseArray =
        typeof provider.value === 'string' ? JSON.parse(`${provider.value}`) : null;
      if (!Array.isArray(phraseArray) || !phraseArray.length) {
        return false;
      }
      return phraseArray.every((phrase) =>
        validateProvider(dataViewField, phrase, provider.valueType)
      );
    case 'range':
      const rangeObject = JSON.parse(typeof provider.value === 'string' ? provider.value : '');
      if (typeof rangeObject !== 'object') {
        return false;
      }

      return (
        (!rangeObject.gte ||
          validateProvider(dataViewField, rangeObject.gte, provider.valueType)) &&
        (!rangeObject.lt || validateProvider(dataViewField, rangeObject.lt, provider.valueType))
      );
    case 'exists':
      return true;
    default:
      throw new Error(`Unknown operator type: ${provider.queryType}`);
  }
}
