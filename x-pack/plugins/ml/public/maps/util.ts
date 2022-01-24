/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection, Feature, Geometry } from 'geojson';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { ESSearchResponse } from '../../../../../src/core/types/elasticsearch';
import { formatHumanReadableDateTimeSeconds } from '../../common/util/date_utils';
import type { MlApiServices } from '../application/services/ml_api_service';
import { MLAnomalyDoc } from '../../common/types/anomalies';
import { VectorSourceRequestMeta } from '../../../maps/common';

export type MlAnomalyLayers = 'typical' | 'actual' | 'typical to actual';
export enum ML_ANOMALY_LAYERS {
  TYPICAL = 'typical',
  ACTUAL = 'actual',
  TYPICAL_TO_ACTUAL = 'typical to actual',
}

// Must reverse coordinates here. Map expects [lon, lat] - anomalies are stored as [lat, lon] for lat_lon jobs
function getCoordinates(actualCoordinateStr: string, round: boolean = false): number[] {
  const convertWithRounding = (point: string) => Math.round(Number(point) * 100) / 100;
  const convert = (point: string) => Number(point);
  return actualCoordinateStr
    .split(',')
    .map(round ? convertWithRounding : convert)
    .reverse();
}

export async function getResultsForJobId(
  mlResultsService: MlApiServices['results'],
  jobId: string,
  locationType: MlAnomalyLayers,
  searchFilters: VectorSourceRequestMeta
): Promise<FeatureCollection> {
  const { timeFilters } = searchFilters;

  const must: estypes.QueryDslQueryContainer[] = [
    { term: { job_id: jobId } },
    { term: { result_type: 'record' } },
  ];

  // Query to look for the highest scoring anomaly.
  const body: estypes.SearchRequest['body'] = {
    query: {
      bool: {
        must,
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
    must.push(timerange);
  }

  let resp: ESSearchResponse<MLAnomalyDoc> | null = null;

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

  const features: Feature[] =
    resp?.hits.hits.map(({ _source }) => {
      const geoResults = _source.geo_results;
      const actualCoordStr = geoResults && geoResults.actual_point;
      const typicalCoordStr = geoResults && geoResults.typical_point;
      let typical: number[] = [];
      let typicalDisplay: number[] = [];
      let actual: number[] = [];
      let actualDisplay: number[] = [];

      if (actualCoordStr !== undefined) {
        actual = getCoordinates(actualCoordStr);
        actualDisplay = getCoordinates(actualCoordStr, true);
      }
      if (typicalCoordStr !== undefined) {
        typical = getCoordinates(typicalCoordStr);
        typicalDisplay = getCoordinates(typicalCoordStr, true);
      }

      let geometry: Geometry;
      if (locationType === 'typical' || locationType === 'actual') {
        geometry = {
          type: 'Point',
          coordinates: locationType === 'typical' ? typical : actual,
        };
      } else {
        geometry = {
          type: 'LineString',
          coordinates: [typical, actual],
        };
      }
      return {
        type: 'Feature',
        geometry,
        properties: {
          actual,
          actualDisplay,
          typical,
          typicalDisplay,
          fieldName: _source.field_name,
          functionDescription: _source.function_description,
          timestamp: formatHumanReadableDateTimeSeconds(_source.timestamp),
          record_score: Math.floor(_source.record_score),
          ...(_source.partition_field_name
            ? { [_source.partition_field_name]: _source.partition_field_value }
            : {}),
          ...(_source.by_field_name ? { [_source.by_field_name]: _source.by_field_value } : {}),
          ...(_source.over_field_name
            ? { [_source.over_field_name]: _source.over_field_value }
            : {}),
        },
      };
    }) || [];

  return {
    type: 'FeatureCollection',
    features,
  };
}
