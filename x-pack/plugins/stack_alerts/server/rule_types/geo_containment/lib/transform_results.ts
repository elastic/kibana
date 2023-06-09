/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import _ from 'lodash';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { GeoContainmentAlertInstanceState } from '../types';

// Flatten agg results and get latest locations for each entity
export function transformResults(
  results: estypes.SearchResponse<unknown>,
  dateField: string,
  geoField: string
): Map<string, GeoContainmentAlertInstanceState[]> {
  const buckets = _.get(results, 'aggregations.shapes.buckets', {});
  const arrResults = _.flatMap(buckets, (bucket: unknown, bucketKey: string) => {
    const subBuckets = _.get(bucket, 'entitySplit.buckets', []);
    return _.map(subBuckets, (subBucket) => {
      const locationFieldResult = _.get(
        subBucket,
        `entityHits.hits.hits[0].fields["${geoField}"][0]`,
        ''
      );
      const location = locationFieldResult
        ? _.chain(locationFieldResult)
            .split(', ')
            .map((coordString) => +coordString)
            .reverse()
            .value()
        : [];
      const dateInShape = _.get(
        subBucket,
        `entityHits.hits.hits[0].fields["${dateField}"][0]`,
        null
      );
      const docId = _.get(subBucket, `entityHits.hits.hits[0]._id`);

      return {
        location,
        shapeLocationId: bucketKey,
        entityName: subBucket.key,
        dateInShape,
        docId,
      };
    });
  });
  const orderedResults = _.orderBy(arrResults, ['entityName', 'dateInShape'], ['asc', 'desc'])
    // Get unique
    .reduce(
      (
        accu: Map<string, GeoContainmentAlertInstanceState[]>,
        el: GeoContainmentAlertInstanceState & { entityName: string }
      ) => {
        const { entityName, ...locationData } = el;
        if (entityName) {
          if (!accu.has(entityName)) {
            accu.set(entityName, []);
          }
          accu.get(entityName)!.push(locationData);
        }
        return accu;
      },
      new Map()
    );
  return orderedResults;
}
