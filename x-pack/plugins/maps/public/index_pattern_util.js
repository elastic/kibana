/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { indexPatternService } from './kibana_services';
import { DECIMAL_DEGREES_PRECISION } from '../common/constants';
import _ from 'lodash';


export async function getIndexPatternsFromIds(indexPatternIds) {

  const promises = [];
  indexPatternIds.forEach((id) => {
    const indexPatternPromise = indexPatternService.get(id);
    if (indexPatternPromise) {
      promises.push(indexPatternPromise);
    }
  });

  return await Promise.all(promises);

}


export function createShapeFilter(geojsonPolygon, indexPatternId, geoField) {
  //take outer ring
  const filter = {
    meta: {
      negate: false,
      index: indexPatternId,
      // eslint-disable-next-line max-len
      alias: `geo polygon at ${_.round(geojsonPolygon.coordinates[0][0][0], DECIMAL_DEGREES_PRECISION)}, ${_.round(geojsonPolygon.coordinates[0][0][1], DECIMAL_DEGREES_PRECISION)}`
    }
  };
  filter.geo_polygon = {
    ignore_unmapped: true,
    [geoField]: {
      points: geojsonPolygon.coordinates[0]
    }
  };
  return filter;
}
