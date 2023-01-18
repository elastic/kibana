/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { emsWorldLayerId } from '../../../../../../common/constants';
import { getDefaultStaticProperties } from '../../../../styles/vector/vector_style_defaults';

jest.mock('../../../../../kibana_services', () => {
  return {
    getIsDarkMode() {
      return false;
    },
    getEMSSettings() {
      return {
        isEMSUrlSet() {
          return false;
        },
      };
    },
  };
});

jest.mock('uuid', () =>
  jest.fn().mockReturnValue({
    v4: () => '12345',
  })
);

import { createLayerDescriptor } from './create_layer_descriptor';
import { OBSERVABILITY_LAYER_TYPE } from './layer_select';
import { OBSERVABILITY_METRIC_TYPE } from './metric_select';
import { DISPLAY } from './display_select';

describe('createLayerDescriptor', () => {
  test('Should create vector layer descriptor with join when displayed as choropleth', () => {
    const layerDescriptor = createLayerDescriptor({
      layer: OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE,
      metric: OBSERVABILITY_METRIC_TYPE.TRANSACTION_DURATION,
      display: DISPLAY.CHOROPLETH,
    });

    expect(layerDescriptor).toEqual({
      __dataRequests: [],
      alpha: 0.75,
      id: '12345',
      includeInFitToBounds: true,
      joins: [
        {
          leftField: 'iso2',
          right: {
            applyGlobalQuery: true,
            applyGlobalTime: true,
            id: '12345',
            indexPatternId: 'apm_static_index_pattern_id',
            metrics: [
              {
                field: 'transaction.duration.us',
                type: 'avg',
              },
            ],
            applyForceRefresh: true,
            term: 'client.geo.country_iso_code',
            type: 'ES_TERM_SOURCE',
            whereQuery: {
              language: 'kuery',
              query: 'processor.event:"transaction"',
            },
          },
        },
      ],
      label: '[Performance] Duration',
      maxZoom: 24,
      minZoom: 0,
      disableTooltips: false,
      sourceDescriptor: {
        id: emsWorldLayerId,
        tooltipProperties: ['name', 'iso2'],
        type: 'EMS_FILE',
      },
      style: {
        isTimeAware: true,
        properties: {
          ...getDefaultStaticProperties(),
          fillColor: {
            options: {
              color: 'Green to Red',
              colorCategory: 'palette_0',
              field: {
                name: '__kbnjoin__avg_of_transaction.duration.us__12345',
                origin: 'join',
              },
              fieldMetaOptions: {
                isEnabled: true,
                sigma: 3,
              },
              type: 'ORDINAL',
            },
            type: 'DYNAMIC',
          },
          lineColor: {
            options: {
              color: '#3d3d3d',
            },
            type: 'STATIC',
          },
        },
        type: 'VECTOR',
      },
      type: 'GEOJSON_VECTOR',
      visible: true,
    });
  });

  test('Should create heatmap layer descriptor when displayed as heatmap', () => {
    const layerDescriptor = createLayerDescriptor({
      layer: OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE,
      metric: OBSERVABILITY_METRIC_TYPE.TRANSACTION_DURATION,
      display: DISPLAY.HEATMAP,
    });
    expect(layerDescriptor).toEqual({
      __dataRequests: [],
      alpha: 0.75,
      id: '12345',
      includeInFitToBounds: true,
      label: '[Performance] Duration',
      maxZoom: 24,
      minZoom: 0,
      query: {
        language: 'kuery',
        query: 'processor.event:"transaction"',
      },
      sourceDescriptor: {
        applyGlobalQuery: true,
        applyGlobalTime: true,
        geoField: 'client.geo.location',
        id: '12345',
        indexPatternId: 'apm_static_index_pattern_id',
        metrics: [
          {
            field: 'transaction.duration.us',
            type: 'avg',
          },
        ],
        requestType: 'heatmap',
        resolution: 'MOST_FINE',
        applyForceRefresh: true,
        type: 'ES_GEO_GRID',
      },
      style: {
        colorRampName: 'theclassic',
        type: 'HEATMAP',
      },
      type: 'HEATMAP',
      visible: true,
    });
  });

  test('Should create vector layer descriptor when displayed as clusters', () => {
    const layerDescriptor = createLayerDescriptor({
      layer: OBSERVABILITY_LAYER_TYPE.APM_RUM_PERFORMANCE,
      metric: OBSERVABILITY_METRIC_TYPE.TRANSACTION_DURATION,
      display: DISPLAY.CLUSTERS,
    });
    expect(layerDescriptor).toEqual({
      __dataRequests: [],
      alpha: 0.75,
      id: '12345',
      includeInFitToBounds: true,
      joins: [],
      label: '[Performance] Duration',
      maxZoom: 24,
      minZoom: 0,
      disableTooltips: false,
      query: {
        language: 'kuery',
        query: 'processor.event:"transaction"',
      },
      sourceDescriptor: {
        applyGlobalQuery: true,
        applyGlobalTime: true,
        geoField: 'client.geo.location',
        id: '12345',
        indexPatternId: 'apm_static_index_pattern_id',
        metrics: [
          {
            field: 'transaction.duration.us',
            type: 'avg',
          },
        ],
        requestType: 'point',
        resolution: 'MOST_FINE',
        applyForceRefresh: true,
        type: 'ES_GEO_GRID',
      },
      style: {
        isTimeAware: true,
        properties: {
          ...getDefaultStaticProperties(),
          fillColor: {
            options: {
              color: 'Green to Red',
              colorCategory: 'palette_0',
              field: {
                name: 'avg_of_transaction.duration.us',
                origin: 'source',
              },
              fieldMetaOptions: {
                isEnabled: true,
                sigma: 3,
              },
              type: 'ORDINAL',
            },
            type: 'DYNAMIC',
          },
          iconSize: {
            options: {
              field: {
                name: 'avg_of_transaction.duration.us',
                origin: 'source',
              },
              fieldMetaOptions: {
                isEnabled: true,
                sigma: 3,
              },
              maxSize: 32,
              minSize: 7,
            },
            type: 'DYNAMIC',
          },
          lineColor: {
            options: {
              color: '#3d3d3d',
            },
            type: 'STATIC',
          },
        },
        type: 'VECTOR',
      },
      type: 'GEOJSON_VECTOR',
      visible: true,
    });
  });
});
