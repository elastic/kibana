/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mapValues, isObject, isArray } from 'lodash/fp';
import { set } from '@kbn/safer-lodash-set';

import { toArray } from '../../../common/utils/to_array';
import { isGeoField } from '../../../common/utils/field_formatters';

export const mapObjectValuesToStringArray = (object: object): object =>
  mapValues((o) => {
    if (isObject(o) && !isArray(o)) {
      return mapObjectValuesToStringArray(o);
    }

    return toArray(o);
  }, object);

export const formatResponseObjectValues = <T>(object: T | T[] | null) => {
  if (object && typeof object === 'object') {
    return mapObjectValuesToStringArray(object as object);
  }

  return object;
};

interface GenericObject {
  [key: string]: unknown;
}

export const unflattenObject = <T extends object = GenericObject>(object: object): T =>
  Object.entries(object).reduce((acc, [key, value]) => {
    set(acc, key, value);
    return acc;
  }, {} as T);

export const formatLocationAsGeoEcs = (item: unknown[]) => {
  const itemGeo = item.length > 0 ? (item[0] as { coordinates: number[] }) : null;
  if (!!itemGeo && isArray(itemGeo.coordinates) && itemGeo.coordinates.length > 1) {
    return {
      lon: [itemGeo.coordinates[0]],
      lat: [itemGeo.coordinates[1]],
    };
  }
  return item;
};

export const transformLocationFields = (locationFields: Record<string, unknown>) => {
  const transformed = { ...locationFields };
  Object.entries(transformed).forEach(([key, item]) => {
    if (isGeoField(key)) {
      transformed[key] = formatLocationAsGeoEcs(item as unknown[]);
    }
  });
  return transformed;
};
