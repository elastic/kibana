/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Mustache from 'mustache';

import {
  DeserializerOrUndefined,
  SearchEsListItemSchema,
  esDataTypeGeoPointRange,
  esDataTypeRange,
  type,
} from '../../../common/schemas';

export const DEFAULT_GEO_POINT = '{{{lat}}},{{{lon}}}';
export const DEFAULT_DATE_RANGE = '{{{gte}}},{{{lte}}}';
export const DEFAULT_LTE_GTE = '{{{gte}}}-{{{lte}}}';
export const DEFAULT_VALUE = '{{{value}}}';

export const findSourceValue = (
  listItem: SearchEsListItemSchema,
  types: string[] = Object.keys(type.keys)
): string | null => {
  const foundEntry = Object.entries(listItem).find(
    ([key, value]) => types.includes(key) && value != null
  );
  if (foundEntry != null) {
    const [foundType, value] = foundEntry;
    switch (foundType) {
      case 'shape':
      case 'geo_shape':
      case 'geo_point': {
        return deserializeValue({
          defaultDeserializer: DEFAULT_GEO_POINT,
          defaultValueDeserializer: DEFAULT_VALUE,
          deserializer: listItem.deserializer,
          value,
        });
      }
      case 'double_range':
      case 'float_range':
      case 'integer_range':
      case 'long_range':
      case 'ip_range': {
        return deserializeValue({
          defaultDeserializer: DEFAULT_LTE_GTE,
          defaultValueDeserializer: DEFAULT_VALUE,
          deserializer: listItem.deserializer,
          value,
        });
      }
      case 'date_range': {
        return deserializeValue({
          defaultDeserializer: DEFAULT_DATE_RANGE,
          defaultValueDeserializer: DEFAULT_VALUE,
          deserializer: listItem.deserializer,
          value,
        });
      }
      default: {
        return deserializeValue({
          defaultDeserializer: DEFAULT_VALUE,
          defaultValueDeserializer: DEFAULT_VALUE,
          deserializer: listItem.deserializer,
          value,
        });
      }
    }
  } else {
    return null;
  }
};

export const deserializeValue = ({
  deserializer,
  defaultValueDeserializer,
  defaultDeserializer,
  value,
}: {
  deserializer: DeserializerOrUndefined;
  defaultValueDeserializer: string;
  defaultDeserializer: string;
  value: string | object | undefined;
}): string | null => {
  if (esDataTypeRange.is(value)) {
    const template =
      deserializer?.includes('gte') && deserializer?.includes('lte')
        ? deserializer
        : defaultDeserializer;
    const variables = { gte: value.gte, lte: value.lte };
    return Mustache.render(template, variables);
  } else if (esDataTypeGeoPointRange.is(value)) {
    const template =
      deserializer?.includes('lat') && deserializer?.includes('lon')
        ? deserializer
        : defaultDeserializer;
    const variables = { lat: value.lat, lon: value.lon };
    return Mustache.render(template, variables);
  } else if (typeof value === 'string') {
    const template = deserializer?.includes('value') ? deserializer : defaultValueDeserializer;
    const variables = { value };
    return Mustache.render(template, variables);
  } else {
    return null;
  }
};
