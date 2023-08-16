/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { GeoContainmentAlertInstanceState } from '../types';

// Flatten agg results and get latest locations for each entity
export function transformResults(
  results: SearchResponse<any>, // eslint-disable-line @typescript-eslint/no-explicit-any
  dateField: string,
  geoField: string
): Map<string, GeoContainmentAlertInstanceState[]> {
  const resultsMap = new Map<string, GeoContainmentAlertInstanceState[]>();
  const boundarySplitBuckets = results?.aggregations?.shapes?.buckets ?? {};
  for (const boundaryId in boundarySplitBuckets) {
    if (!boundarySplitBuckets.hasOwnProperty(boundaryId)) {
      continue;
    }

    const entitySplitBuckets = boundarySplitBuckets[boundaryId]?.entitySplit?.buckets ?? [];
    for (let i = 0; i < entitySplitBuckets.length; i++) {
      const entityName = entitySplitBuckets[i].key;
      const entityResults = resultsMap.get(entityName) ?? [];
      entityResults.push({
        location: entitySplitBuckets[i].entityHits?.hits?.hits?.[0]?.fields?.[geoField]?.[0] ?? '',
        shapeLocationId: boundaryId,
        dateInShape:
          entitySplitBuckets[i].entityHits?.hits?.hits?.[0]?.fields?.[dateField]?.[0] ?? null,
        docId: entitySplitBuckets[i].entityHits?.hits?.hits?.[0]?._id,
      });
      resultsMap.set(entityName, entityResults);
    }
  }

  return resultsMap;
}
