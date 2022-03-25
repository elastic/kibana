/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection, Feature, Geometry } from 'geojson';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { fromKueryExpression, luceneStringToDsl, toElasticsearchQuery } from '@kbn/es-query';
import { ESSearchResponse } from '../../../../../src/core/types/elasticsearch';
import { formatHumanReadableDateTimeSeconds } from '../../common/util/date_utils';
import type { MlApiServices } from '../application/services/ml_api_service';
import { MLAnomalyDoc } from '../../common/types/anomalies';
import { VectorSourceRequestMeta } from '../../../maps/common';
import { SEARCH_QUERY_LANGUAGE } from '../../common/constants/search';
import { getIndexPattern } from '../application/explorer/reducers/explorer_reducer/get_index_pattern';

export const ML_ANOMALY_LAYERS = {
  TYPICAL: 'typical',
  ACTUAL: 'actual',
  TYPICAL_TO_ACTUAL: 'typical to actual',
} as const;

export type MlAnomalyLayersType = typeof ML_ANOMALY_LAYERS[keyof typeof ML_ANOMALY_LAYERS];
const INFLUENCER_LIMIT = 3;
const INFLUENCER_MAX_VALUES = 3;

export function getInfluencersHtmlString(
  influencers: Array<{ influencer_field_name: string; influencer_field_values: string[] }>,
  splitFields: string[]
) {
  let htmlString = '<ul>';
  let influencerCount = 0;
  for (let i = 0; i < influencers.length; i++) {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const { influencer_field_name, influencer_field_values } = influencers[i];
    // Skip if there are no values or it's a partition field
    if (!influencer_field_values.length || splitFields.includes(influencer_field_name)) continue;

    const fieldValuesString = influencer_field_values.slice(0, INFLUENCER_MAX_VALUES).join(', ');

    htmlString += `<li>${influencer_field_name}: ${fieldValuesString}</li>`;
    influencerCount += 1;

    if (influencerCount === INFLUENCER_LIMIT) {
      break;
    }
  }
  htmlString += '</ul>';

  return htmlString;
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
  locationType: MlAnomalyLayersType,
  searchFilters: VectorSourceRequestMeta
): Promise<FeatureCollection> {
  const { query, timeFilters } = searchFilters;
  const hasQuery = query && query.query !== '';
  let queryFilter;
  // @ts-ignore missing properties from ExplorerJob - those fields aren't required for this
  const indexPattern = getIndexPattern([{ id: jobId }]);

  if (hasQuery && query.language === SEARCH_QUERY_LANGUAGE.KUERY) {
    queryFilter = toElasticsearchQuery(fromKueryExpression(query.query), indexPattern);
  } else if (hasQuery && query?.language === SEARCH_QUERY_LANGUAGE.LUCENE) {
    queryFilter = luceneStringToDsl(query.query);
  }

  const must: estypes.QueryDslQueryContainer[] = [
    { term: { job_id: jobId } },
    { term: { result_type: 'record' } },
  ];

  let bool: estypes.QueryDslBoolQuery = {
    must,
  };

  if (queryFilter && queryFilter.bool) {
    bool = { ...bool, ...queryFilter.bool };
  } else if (queryFilter) {
    // @ts-ignore push doesn't exist on type QueryDslQueryContainer | QueryDslQueryContainer[] | undefined
    bool.must.push(queryFilter);
  }

  // Query to look for the highest scoring anomaly.
  const body: estypes.SearchRequest['body'] = {
    query: {
      bool,
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
      if (locationType === ML_ANOMALY_LAYERS.TYPICAL || locationType === ML_ANOMALY_LAYERS.ACTUAL) {
        geometry = {
          type: 'Point',
          coordinates: locationType === ML_ANOMALY_LAYERS.TYPICAL ? typical : actual,
        };
      } else {
        geometry = {
          type: 'LineString',
          coordinates: [typical, actual],
        };
      }

      const splitFields = {
        ...(_source.partition_field_name
          ? { [_source.partition_field_name]: _source.partition_field_value }
          : {}),
        ...(_source.by_field_name ? { [_source.by_field_name]: _source.by_field_value } : {}),
        ...(_source.over_field_name ? { [_source.over_field_name]: _source.over_field_value } : {}),
      };

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
          ...(Object.keys(splitFields).length > 0 ? splitFields : {}),
          ...(_source.influencers?.length
            ? {
                influencers: getInfluencersHtmlString(
                  _source.influencers,
                  Object.keys(splitFields)
                ),
              }
            : {}),
        },
      };
    }) || [];

  return {
    type: 'FeatureCollection',
    features,
  };
}
