/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isPopulatedObject } from '@kbn/ml-is-populated-object';
import { isDefined } from '@kbn/ml-is-defined';
import { GeoPointExample, LatLongExample } from '../../../../common/types/field_request_config';

export function isGeoPointExample(arg: unknown): arg is GeoPointExample {
  return isPopulatedObject(arg, ['coordinates']) && Array.isArray(arg.coordinates);
}

export function isLonLatExample(arg: unknown): arg is LatLongExample {
  return isPopulatedObject(arg, ['lon', 'lat']);
}

export function getUniqGeoOrStrExamples(
  examples: Array<string | GeoPointExample | LatLongExample | object> | undefined,
  maxExamples = 10
): Array<string | GeoPointExample | LatLongExample | object> {
  const uniqueCoordinates: Array<string | GeoPointExample | LatLongExample | object> = [];
  if (!isDefined(examples)) return uniqueCoordinates;
  for (let i = 0; i < examples.length; i++) {
    const example = examples[i];
    if (typeof example === 'string' && uniqueCoordinates.indexOf(example) === -1) {
      uniqueCoordinates.push(example);
    } else {
      if (
        isGeoPointExample(example) &&
        uniqueCoordinates.findIndex(
          (c) =>
            isGeoPointExample(c) &&
            c.type === example.type &&
            example.coordinates.every((coord, idx) => coord === c.coordinates[idx])
        ) === -1
      ) {
        uniqueCoordinates.push(example);
      }

      if (
        isLonLatExample(example) &&
        uniqueCoordinates.findIndex(
          (c) => isLonLatExample(c) && example.lon === c.lon && example.lat === c.lat
        ) === -1
      ) {
        uniqueCoordinates.push(example);
      }
    }
    if (uniqueCoordinates.length === maxExamples) {
      return uniqueCoordinates;
    }
  }

  return uniqueCoordinates;
}
