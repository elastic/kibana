/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection, Feature } from 'geojson';
import { ESSearchResponse } from '../../../../../src/core/types/elasticsearch';
import { MlApiServices } from '../application/services/ml_api_service';
import { MLAnomalyDoc } from '../../common/types/anomalies';
import type { SearchFilters } from './anomaly_source';

export type MlAnomalyLayers = 'typical' | 'actual' | 'connected';

export async function getResultsForJobId(
  mlResultsService: MlApiServices['results'],
  jobId: string,
  locationType: MlAnomalyLayers,
  searchFilters: SearchFilters
): Promise<FeatureCollection> {
  const { timeFilters } = searchFilters;
  // Query to look for the highest scoring anomaly.
  const body: any = {
    query: {
      bool: {
        must: [{ term: { job_id: jobId } }, { term: { result_type: 'record' } }],
      },
    },
    size: 1000,
    _source: {
      excludes: [],
    },
  };

  if (timeFilters) {
    const timerange = {
      range: {
        timestamp: {
          gte: `${timeFilters.from}`,
          lte: timeFilters.to,
        },
      },
    };
    body.query.bool.must.push(timerange);
  }

  let resp: ESSearchResponse<MLAnomalyDoc> | null = null;
  let hits: Array<{ typical: number[]; actual: number[]; record_score: number }> = [];

  try {
    resp = await mlResultsService.anomalySearch(
      {
        body,
      },
      [jobId]
    );
  } catch (error) {
    // search may fail if the job doesn't already exist
    // ignore this error as the outer function call will raise a toast
  }
  if (resp !== null && resp.hits.total.value > 0) {
    hits = resp.hits.hits.map(({ _source }) => {
      const geoResults = _source.geo_results;
      const actualCoordStr = geoResults && geoResults.actual_point;
      const typicalCoordStr = geoResults && geoResults.typical_point;
      let typical;
      let actual;
      // Must reverse coordinates here. Map expects [lon, lat] - anomalies are stored as [lat, lon] for lat_lon jobs
      if (actualCoordStr !== undefined) {
        actual = actualCoordStr
          .split(',')
          .map((point: string) => Number(point))
          .reverse();
      }
      if (typicalCoordStr !== undefined) {
        typical = typicalCoordStr
          .split(',')
          .map((point: string) => Number(point))
          .reverse();
      }
      return {
        typical,
        actual,
        record_score: Math.floor(_source.record_score),
      };
    });
  }

  // @ts-ignore
  const features: Feature[] = hits!.map((result) => {
    let geometry;
    if (locationType === 'typical' || locationType === 'actual') {
      geometry = {
        type: 'Point',
        coordinates: locationType === 'typical' ? result.typical : result.actual,
      };
    } else {
      geometry = {
        type: 'LineString',
        coordinates: [result.typical, result.actual],
      };
    }
    return {
      type: 'Feature',
      geometry,
      properties: {
        record_score: result.record_score,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
