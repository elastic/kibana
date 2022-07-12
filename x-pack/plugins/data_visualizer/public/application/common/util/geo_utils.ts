/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { GeoPointExample } from '../../../../common/types/field_request_config';
import { isDefined } from './is_defined';

export function isGeoPointExample(arg: unknown): arg is GeoPointExample {
  return isPopulatedObject(arg, ['coordinates']);
}

export function getUniqCoordinates(
  coordinates: Array<string | GeoPointExample | object> | undefined
): GeoPointExample[] {
  const uniqueCoordinates: GeoPointExample[] = [];
  if (!isDefined(coordinates)) return uniqueCoordinates;

  coordinates.forEach((ex) => {
    if (
      isGeoPointExample(ex) &&
      uniqueCoordinates.findIndex(
        (c) =>
          c.type === ex.type && ex.coordinates.every((coord, idx) => coord === c.coordinates[idx])
      ) === -1
    ) {
      uniqueCoordinates.push(ex);
    }
  });
  return uniqueCoordinates;
}
