/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FeatureCollection, Feature, Geometry } from 'geojson';
import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import { htmlIdGenerator } from '@elastic/eui';
import { FIELD_ORIGIN, STYLE_TYPE, LayerDescriptor } from '@kbn/maps-plugin/common';
import {
  ESSearchSourceDescriptor,
  VectorStyleDescriptor,
} from '@kbn/maps-plugin/common/descriptor_types';
import type { SerializableRecord } from '@kbn/utility-types';
import { fromKueryExpression, luceneStringToDsl, toElasticsearchQuery } from '@kbn/es-query';
import type { ESSearchResponse } from '@kbn/es-types';
import { VectorSourceRequestMeta } from '@kbn/maps-plugin/common';
import { LAYER_TYPE, SOURCE_TYPES, SCALING_TYPES } from '@kbn/maps-plugin/common';
import { SEVERITY_COLOR_RAMP } from '../../common';
import { formatHumanReadableDateTimeSeconds } from '../../common/util/date_utils';
import type { MlApiServices } from '../application/services/ml_api_service';
import { MLAnomalyDoc } from '../../common/types/anomalies';
import { SEARCH_QUERY_LANGUAGE } from '../../common/constants/search';
import { tabColor } from '../../common/util/group_color_utils';
import { getIndexPattern } from '../application/explorer/reducers/explorer_reducer/get_index_pattern';
import { AnomalySource } from './anomaly_source';
import { SourceIndexGeoFields } from '../application/explorer/explorer_utils';

export const ML_ANOMALY_LAYERS = {
  TYPICAL: 'typical',
  ACTUAL: 'actual',
  TYPICAL_TO_ACTUAL: 'typical to actual',
} as const;

export const CUSTOM_COLOR_RAMP = {
  type: STYLE_TYPE.DYNAMIC,
  options: {
    customColorRamp: SEVERITY_COLOR_RAMP,
    field: {
      name: 'record_score',
      origin: FIELD_ORIGIN.SOURCE,
    },
    useCustomColorRamp: true,
  },
};

export const ACTUAL_STYLE = {
  type: 'VECTOR',
  properties: {
    fillColor: CUSTOM_COLOR_RAMP,
    lineColor: CUSTOM_COLOR_RAMP,
  },
  isTimeAware: false,
};

export const TYPICAL_STYLE = {
  type: 'VECTOR',
  properties: {
    fillColor: {
      type: 'STATIC',
      options: {
        color: '#98A2B2',
      },
    },
    lineColor: {
      type: 'STATIC',
      options: {
        color: '#fff',
      },
    },
    lineWidth: {
      type: 'STATIC',
      options: {
        size: 2,
      },
    },
    iconSize: {
      type: 'STATIC',
      options: {
        size: 6,
      },
    },
  },
};

export type MlAnomalyLayersType = typeof ML_ANOMALY_LAYERS[keyof typeof ML_ANOMALY_LAYERS];

// Must reverse coordinates here. Map expects [lon, lat] - anomalies are stored as [lat, lon] for lat_lon jobs
function getCoordinates(latLonString: string): number[] {
  return latLonString
    .split(',')
    .map((coordinate: string) => Number(coordinate))
    .reverse();
}

export function getInitialAnomaliesLayers(jobId: string) {
  const initialLayers = [];
  for (const layer in ML_ANOMALY_LAYERS) {
    if (ML_ANOMALY_LAYERS.hasOwnProperty(layer)) {
      initialLayers.push({
        id: htmlIdGenerator()(),
        type: LAYER_TYPE.GEOJSON_VECTOR,
        sourceDescriptor: AnomalySource.createDescriptor({
          jobId,
          typicalActual: ML_ANOMALY_LAYERS[layer as keyof typeof ML_ANOMALY_LAYERS],
        }),
        style:
          ML_ANOMALY_LAYERS[layer as keyof typeof ML_ANOMALY_LAYERS] === ML_ANOMALY_LAYERS.TYPICAL
            ? TYPICAL_STYLE
            : ACTUAL_STYLE,
      });
    }
  }
  return initialLayers;
}

export function getInitialSourceIndexFieldLayers(sourceIndexWithGeoFields: SourceIndexGeoFields) {
  const initialLayers = [] as unknown as LayerDescriptor[] & SerializableRecord;
  for (const index in sourceIndexWithGeoFields) {
    if (sourceIndexWithGeoFields.hasOwnProperty(index)) {
      const { dataViewId, geoFields } = sourceIndexWithGeoFields[index];

      geoFields.forEach((geoField) => {
        const color = tabColor(geoField);

        initialLayers.push({
          id: htmlIdGenerator()(),
          type: LAYER_TYPE.GEOJSON_VECTOR,
          style: {
            type: 'VECTOR',
            properties: {
              fillColor: {
                type: 'STATIC',
                options: {
                  color,
                },
              },
              lineColor: {
                type: 'STATIC',
                options: {
                  color,
                },
              },
            },
          } as unknown as VectorStyleDescriptor,
          sourceDescriptor: {
            id: htmlIdGenerator()(),
            type: SOURCE_TYPES.ES_SEARCH,
            tooltipProperties: [geoField],
            label: index,
            indexPatternId: dataViewId,
            geoField,
            scalingType: SCALING_TYPES.MVT,
          } as unknown as ESSearchSourceDescriptor,
        });
      });
    }
  }
  return initialLayers;
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
      const actual =
        geoResults && geoResults.actual_point ? getCoordinates(geoResults.actual_point) : [0, 0];
      const typical =
        geoResults && geoResults.typical_point ? getCoordinates(geoResults.typical_point) : [0, 0];

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

      const splitFieldKeys = Object.keys(splitFields);
      const influencers = _source.influencers
        ? _source.influencers.filter(
            ({ influencer_field_name: name, influencer_field_values: values }) => {
              // remove influencers without values and influencers on partition fields
              return values.length && !splitFieldKeys.includes(name);
            }
          )
        : [];

      return {
        type: 'Feature',
        geometry,
        properties: {
          actual,
          typical,
          fieldName: _source.field_name,
          functionDescription: _source.function_description,
          timestamp: formatHumanReadableDateTimeSeconds(_source.timestamp),
          record_score: Math.floor(_source.record_score),
          ...(Object.keys(splitFields).length > 0 ? splitFields : {}),
          ...(influencers.length
            ? {
                influencers,
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
