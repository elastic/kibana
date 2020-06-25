/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

jest.mock('../../../../kibana_services', () => {
  const mockUiSettings = {
    get: () => {
      return undefined;
    },
  };
  return {
    getUiSettings: () => {
      return mockUiSettings;
    },
  };
});

jest.mock('uuid/v4', () => {
  return function () {
    return '12345';
  };
});

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
      joins: [
        {
          leftField: 'iso2',
          right: {
            id: '12345',
            indexPatternId: 'apm_static_index_pattern_id',
            indexPatternTitle: 'apm-*',
            metrics: [
              {
                field: 'transaction.duration.us',
                type: 'avg',
              },
            ],
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
      sourceDescriptor: {
        id: 'world_countries',
        tooltipProperties: ['name', 'iso2'],
        type: 'EMS_FILE',
      },
      style: {
        isTimeAware: true,
        properties: {
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
          icon: {
            options: {
              value: 'marker',
            },
            type: 'STATIC',
          },
          iconOrientation: {
            options: {
              orientation: 0,
            },
            type: 'STATIC',
          },
          iconSize: {
            options: {
              size: 6,
            },
            type: 'STATIC',
          },
          labelText: {
            options: {
              value: '',
            },
            type: 'STATIC',
          },
          labelBorderColor: {
            options: {
              color: '#FFFFFF',
            },
            type: 'STATIC',
          },
          labelBorderSize: {
            options: {
              size: 'SMALL',
            },
          },
          labelColor: {
            options: {
              color: '#000000',
            },
            type: 'STATIC',
          },
          labelSize: {
            options: {
              size: 14,
            },
            type: 'STATIC',
          },
          lineColor: {
            options: {
              color: '#3d3d3d',
            },
            type: 'STATIC',
          },
          lineWidth: {
            options: {
              size: 1,
            },
            type: 'STATIC',
          },
          symbolizeAs: {
            options: {
              value: 'circle',
            },
          },
        },
        type: 'VECTOR',
      },
      type: 'VECTOR',
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
      joins: [],
      label: '[Performance] Duration',
      maxZoom: 24,
      minZoom: 0,
      query: {
        language: 'kuery',
        query: 'processor.event:"transaction"',
      },
      sourceDescriptor: {
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
      joins: [],
      label: '[Performance] Duration',
      maxZoom: 24,
      minZoom: 0,
      query: {
        language: 'kuery',
        query: 'processor.event:"transaction"',
      },
      sourceDescriptor: {
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
        type: 'ES_GEO_GRID',
      },
      style: {
        isTimeAware: true,
        properties: {
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
          icon: {
            options: {
              value: 'marker',
            },
            type: 'STATIC',
          },
          iconOrientation: {
            options: {
              orientation: 0,
            },
            type: 'STATIC',
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
          labelText: {
            options: {
              value: '',
            },
            type: 'STATIC',
          },
          labelBorderColor: {
            options: {
              color: '#FFFFFF',
            },
            type: 'STATIC',
          },
          labelBorderSize: {
            options: {
              size: 'SMALL',
            },
          },
          labelColor: {
            options: {
              color: '#000000',
            },
            type: 'STATIC',
          },
          labelSize: {
            options: {
              size: 14,
            },
            type: 'STATIC',
          },
          lineColor: {
            options: {
              color: '#3d3d3d',
            },
            type: 'STATIC',
          },
          lineWidth: {
            options: {
              size: 1,
            },
            type: 'STATIC',
          },
          symbolizeAs: {
            options: {
              value: 'circle',
            },
          },
        },
        type: 'VECTOR',
      },
      type: 'VECTOR',
      visible: true,
    });
  });
});
