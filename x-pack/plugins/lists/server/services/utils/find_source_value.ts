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

export const DEFAULT_GEO_POINT = '{{lat}},{{lon}}';
export const DEFAULT_DATE_RANGE = '{{gte}},{{lte}}';
export const DEFAULT_LTE_GTE = '{{gte}}-{{lte}}';
export const DEFAULT_VALUE = '{{value}}';

export const findSourceValue = (
  hit: SearchEsListItemSchema,
  types: string[] = Object.keys(type.keys)
): string | null => {
  const foundEntry = Object.entries(hit).find(
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
          deserializer: hit.deserializer,
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
          deserializer: hit.deserializer,
          value,
        });
      }
      case 'date_range': {
        return deserializeValue({
          defaultDeserializer: DEFAULT_DATE_RANGE,
          deserializer: hit.deserializer,
          value,
        });
      }
      default: {
        return deserializeValue({
          defaultDeserializer: DEFAULT_LTE_GTE,
          deserializer: hit.deserializer,
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
  defaultDeserializer,
  value,
}: {
  deserializer: DeserializerOrUndefined;
  defaultDeserializer: string;
  value: string | object | undefined;
}): string | null => {
  if (esDataTypeRange.is(value)) {
    if (value.gte === value.lte) {
      // Since gte and lte are the same we want to deserialize this back out as the default of a single element
      return value.gte;
    } else {
      const template = deserializer ?? defaultDeserializer;
      const variables = { gte: value.gte, lte: value.lte };
      return Mustache.render(template, variables);
    }
  } else if (esDataTypeGeoPointRange.is(value)) {
    const template = deserializer ?? defaultDeserializer;
    const variables = { lat: value.lat, lon: value.lon };
    return Mustache.render(template, variables);
  } else if (typeof value === 'string') {
    // This fall back works as it returns the regular string which can be anything
    // from a well known type (WKT) or a plain number string as "52" or just a regular
    // value of a date time such as 2020-06-28T15:36:13.764Z
    return value;
  } else {
    return null;
  }
};
