/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

const layerList = [
  {
    id: '0hmz5',
    alpha: 1,
    sourceDescriptor: {
      type: 'EMS_TMS',
      isAutoSelect: true,
    },
    visible: true,
    style: {},
    type: 'VECTOR_TILE',
    minZoom: 0,
    maxZoom: 24,
  },
  {
    id: 'jzppx',
    label: 'Flights',
    minZoom: 9,
    maxZoom: 24,
    alpha: 1,
    sourceDescriptor: {
      id: '040e0f25-9687-4569-a1e0-76f1a108da56',
      type: 'ES_SEARCH',
      geoField: 'DestLocation',
      limit: 2048,
      filterByMapBounds: true,
      tooltipProperties: [
        'Carrier',
        'DestCityName',
        'DestCountry',
        'OriginCityName',
        'OriginCountry',
        'FlightDelayMin',
        'FlightTimeMin',
        'DistanceMiles',
        'AvgTicketPrice',
        'FlightDelay',
      ],
      indexPatternRefName: 'layer_1_source_index_pattern',
    },
    visible: true,
    style: {
      type: 'VECTOR',
      properties: {
        fillColor: {
          type: 'DYNAMIC',
          options: {
            field: {
              name: 'FlightTimeMin',
              origin: 'source',
            },
            color: 'Greens',
          },
        },
        lineColor: {
          type: 'STATIC',
          options: {
            color: '#FFFFFF',
          },
        },
        lineWidth: {
          type: 'STATIC',
          options: {
            size: 1,
          },
        },
        iconSize: {
          type: 'DYNAMIC',
          options: {
            field: {
              name: 'DistanceMiles',
              origin: 'source',
            },
            minSize: 1,
            maxSize: 32,
          },
        },
      },
    },
    type: 'VECTOR',
  },
  {
    id: 'y4jsz',
    label: 'Flight Origin Location',
    minZoom: 0,
    maxZoom: 9,
    alpha: 1,
    sourceDescriptor: {
      type: 'ES_GEO_GRID',
      resolution: 'COARSE',
      id: 'fe893f84-388e-4865-8df4-650748533a77',
      geoField: 'OriginLocation',
      requestType: 'point',
      metrics: [
        {
          type: 'count',
          label: 'flight count',
        },
        {
          type: 'avg',
          field: 'FlightTimeMin',
          label: 'minimum flight time',
        },
      ],
      indexPatternRefName: 'layer_2_source_index_pattern',
    },
    visible: true,
    style: {
      type: 'VECTOR',
      properties: {
        fillColor: {
          type: 'DYNAMIC',
          options: {
            field: {
              name: 'doc_count',
              origin: 'source',
            },
            color: 'Blues',
          },
        },
        lineColor: {
          type: 'STATIC',
          options: {
            color: '#110081',
          },
        },
        lineWidth: {
          type: 'STATIC',
          options: {
            size: 1,
          },
        },
        iconSize: {
          type: 'DYNAMIC',
          options: {
            field: {
              name: 'avg_of_FlightTimeMin',
              origin: 'source',
            },
            minSize: 1,
            maxSize: 32,
          },
        },
      },
    },
    type: 'VECTOR',
  },
  {
    id: 'x8xpo',
    label: 'Flight Destination Location',
    minZoom: 0,
    maxZoom: 9,
    alpha: 1,
    sourceDescriptor: {
      type: 'ES_GEO_GRID',
      resolution: 'COARSE',
      id: '60a7346a-8c5f-4c03-b7d1-e8b36e847551',
      geoField: 'DestLocation',
      requestType: 'point',
      metrics: [
        {
          type: 'count',
          label: 'flight count',
        },
        {
          type: 'avg',
          field: 'FlightDelayMin',
          label: 'average delay',
        },
      ],
      indexPatternRefName: 'layer_3_source_index_pattern',
    },
    visible: true,
    style: {
      type: 'VECTOR',
      properties: {
        fillColor: {
          type: 'DYNAMIC',
          options: {
            field: {
              name: 'doc_count',
              origin: 'source',
            },
            color: 'Reds',
          },
        },
        lineColor: {
          type: 'STATIC',
          options: {
            color: '#af0303',
          },
        },
        lineWidth: {
          type: 'STATIC',
          options: {
            size: 1,
          },
        },
        iconSize: {
          type: 'DYNAMIC',
          options: {
            field: {
              name: 'avg_of_FlightDelayMin',
              origin: 'source',
            },
            minSize: 1,
            maxSize: 32,
          },
        },
      },
    },
    type: 'VECTOR',
  },
];

export const getFlightsSavedObjects = () => {
  return [
    {
      id: '5dd88580-1906-11e9-919b-ffe5949a18d2',
      type: 'map',
      updated_at: '2019-01-15T20:44:54.767Z',
      version: 2,
      references: [
        {
          name: 'layer_1_source_index_pattern',
          type: 'index-pattern',
          id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        },
        {
          name: 'layer_2_source_index_pattern',
          type: 'index-pattern',
          id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        },
        {
          name: 'layer_3_source_index_pattern',
          type: 'index-pattern',
          id: 'd3d7af60-4c81-11e8-b3d7-01146121b73d',
        },
      ],
      migrationVersion: {
        map: '7.4.0',
      },
      attributes: {
        title: i18n.translate('xpack.maps.sampleData.flightaSpec.mapsTitle', {
          defaultMessage: '[Flights] Origin and Destination Flight Time',
        }),
        description: '',
        mapStateJSON:
          '{"zoom":3.14,"center":{"lon":-89.58746,"lat":38.38637},"timeFilters":{"from":"now-7d","to":"now"},"refreshConfig":{"isPaused":true,"interval":0},"query":{"query":"","language":"kuery"}}',
        layerListJSON: JSON.stringify(layerList),
        uiStateJSON: '{"isDarkMode":false}',
        bounds: {
          type: 'envelope',
          coordinates: [
            [-139.83779, 56.64828],
            [-39.33713, 14.04811],
          ],
        },
      },
    },
  ];
};
