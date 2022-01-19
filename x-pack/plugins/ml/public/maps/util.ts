/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection, Feature, Geometry } from 'geojson';
import { ESSearchResponse } from '../../../../../src/core/types/elasticsearch';
import { formatHumanReadableDateTimeSeconds } from '../../common/util/date_utils';
import type { MlApiServices } from '../application/services/ml_api_service';
import { MLAnomalyDoc } from '../../common/types/anomalies';
import { VectorSourceRequestMeta } from '../../../maps/common';

export type MlAnomalyLayers = 'typical' | 'actual' | 'connected';

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
  let hits: Array<{
    actual: number[];
    actualDisplay: number[];
    fieldName?: string;
    functionDescription: string;
    typical: number[];
    typicalDisplay: number[];
    record_score: number;
    timestamp: string;
  }> = [];

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
      return {
        fieldName: _source.field_name,
        functionDescription: _source.function_description,
        timestamp: formatHumanReadableDateTimeSeconds(_source.timestamp),
        typical,
        typicalDisplay,
        actual,
        actualDisplay,
        record_score: Math.floor(_source.record_score),
      };
    });
  }

  const features: Feature[] = hits.map((result) => {
    let geometry: Geometry;
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
        actual: result.actual,
        actualDisplay: result.actualDisplay,
        typical: result.typical,
        typicalDisplay: result.typicalDisplay,
        fieldName: result.fieldName,
        functionDescription: result.functionDescription,
        timestamp: result.timestamp,
        record_score: result.record_score,
      },
    };
  });

  return {
    type: 'FeatureCollection',
    features,
  };
}
