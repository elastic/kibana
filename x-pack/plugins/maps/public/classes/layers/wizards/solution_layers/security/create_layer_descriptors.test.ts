/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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

jest.mock('uuid/v4', () => {
  return function () {
    return '12345';
  };
});

import { createSecurityLayerDescriptors } from './create_layer_descriptors';

describe('createLayerDescriptor', () => {
  test('apm index', () => {
    expect(createSecurityLayerDescriptors('id', 'apm-*-transaction*')).toEqual([
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        includeInFitToBounds: true,
        joins: [],
        label: 'apm-*-transaction* | Source Point',
        maxZoom: 24,
        minZoom: 0,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'client.geo.location',
          id: '12345',
          indexPatternId: 'id',
          applyForceRefresh: true,
          scalingType: 'TOP_HITS',
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'client.ip',
            'client.domain',
            'client.geo.country_iso_code',
            'client.as.organization.name',
          ],
          topHitsSize: 1,
          topHitsSplitField: 'client.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
          properties: {
            fillColor: {
              options: {
                color: '#6092C0',
              },
              type: 'STATIC',
            },
            icon: {
              options: {
                value: 'home',
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
                size: 8,
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
            labelText: {
              options: {
                value: '',
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        includeInFitToBounds: true,
        joins: [],
        label: 'apm-*-transaction* | Destination point',
        maxZoom: 24,
        minZoom: 0,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'server.geo.location',
          id: '12345',
          indexPatternId: 'id',
          applyForceRefresh: true,
          scalingType: 'TOP_HITS',
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'server.ip',
            'server.domain',
            'server.geo.country_iso_code',
            'server.as.organization.name',
          ],
          topHitsSize: 1,
          topHitsSplitField: 'server.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
          properties: {
            fillColor: {
              options: {
                color: '#D36086',
              },
              type: 'STATIC',
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
                size: 8,
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
            labelText: {
              options: {
                value: '',
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        includeInFitToBounds: true,
        joins: [],
        label: 'apm-*-transaction* | Line',
        maxZoom: 24,
        minZoom: 0,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          destGeoField: 'server.geo.location',
          id: '12345',
          indexPatternId: 'id',
          metrics: [
            {
              field: 'client.bytes',
              type: 'sum',
            },
            {
              field: 'server.bytes',
              type: 'sum',
            },
          ],
          applyForceRefresh: true,
          sourceGeoField: 'client.geo.location',
          type: 'ES_PEW_PEW',
        },
        style: {
          isTimeAware: true,
          properties: {
            fillColor: {
              options: {
                color: '#54B399',
              },
              type: 'STATIC',
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
            labelText: {
              options: {
                value: '',
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#6092C0',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                field: {
                  name: 'doc_count',
                  origin: 'source',
                },
                fieldMetaOptions: {
                  isEnabled: true,
                  sigma: 3,
                },
                maxSize: 8,
                minSize: 1,
              },
              type: 'DYNAMIC',
            },
            symbolizeAs: {
              options: {
                value: 'circle',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
    ]);
  });

  test('non-apm index', () => {
    expect(createSecurityLayerDescriptors('id', 'filebeat-*')).toEqual([
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        includeInFitToBounds: true,
        joins: [],
        label: 'filebeat-* | Source Point',
        maxZoom: 24,
        minZoom: 0,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'source.geo.location',
          id: '12345',
          indexPatternId: 'id',
          applyForceRefresh: true,
          scalingType: 'TOP_HITS',
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'source.ip',
            'source.domain',
            'source.geo.country_iso_code',
            'source.as.organization.name',
          ],
          topHitsSize: 1,
          topHitsSplitField: 'source.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
          properties: {
            fillColor: {
              options: {
                color: '#6092C0',
              },
              type: 'STATIC',
            },
            icon: {
              options: {
                value: 'home',
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
                size: 8,
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
            labelText: {
              options: {
                value: '',
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        includeInFitToBounds: true,
        joins: [],
        label: 'filebeat-* | Destination point',
        maxZoom: 24,
        minZoom: 0,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'destination.geo.location',
          id: '12345',
          indexPatternId: 'id',
          applyForceRefresh: true,
          scalingType: 'TOP_HITS',
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'destination.ip',
            'destination.domain',
            'destination.geo.country_iso_code',
            'destination.as.organization.name',
          ],
          topHitsSize: 1,
          topHitsSplitField: 'destination.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
          properties: {
            fillColor: {
              options: {
                color: '#D36086',
              },
              type: 'STATIC',
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
                size: 8,
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
            labelText: {
              options: {
                value: '',
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        includeInFitToBounds: true,
        joins: [],
        label: 'filebeat-* | Line',
        maxZoom: 24,
        minZoom: 0,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          destGeoField: 'destination.geo.location',
          id: '12345',
          indexPatternId: 'id',
          metrics: [
            {
              field: 'source.bytes',
              type: 'sum',
            },
            {
              field: 'destination.bytes',
              type: 'sum',
            },
          ],
          applyForceRefresh: true,
          sourceGeoField: 'source.geo.location',
          type: 'ES_PEW_PEW',
        },
        style: {
          isTimeAware: true,
          properties: {
            fillColor: {
              options: {
                color: '#54B399',
              },
              type: 'STATIC',
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
            labelText: {
              options: {
                value: '',
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#6092C0',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                field: {
                  name: 'doc_count',
                  origin: 'source',
                },
                fieldMetaOptions: {
                  isEnabled: true,
                  sigma: 3,
                },
                maxSize: 8,
                minSize: 1,
              },
              type: 'DYNAMIC',
            },
            symbolizeAs: {
              options: {
                value: 'circle',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
    ]);
  });

  test('apm data stream', () => {
    expect(createSecurityLayerDescriptors('id', 'traces-apm-opbean-node')).toEqual([
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        includeInFitToBounds: true,
        joins: [],
        label: 'traces-apm-opbean-node | Source Point',
        maxZoom: 24,
        minZoom: 0,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'client.geo.location',
          id: '12345',
          applyForceRefresh: true,
          indexPatternId: 'id',
          scalingType: 'TOP_HITS',
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'client.ip',
            'client.domain',
            'client.geo.country_iso_code',
            'client.as.organization.name',
          ],
          topHitsSize: 1,
          topHitsSplitField: 'client.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
          properties: {
            fillColor: {
              options: {
                color: '#6092C0',
              },
              type: 'STATIC',
            },
            icon: {
              options: {
                value: 'home',
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
                size: 8,
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
            labelText: {
              options: {
                value: '',
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        includeInFitToBounds: true,
        joins: [],
        label: 'traces-apm-opbean-node | Destination point',
        maxZoom: 24,
        minZoom: 0,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          filterByMapBounds: true,
          geoField: 'server.geo.location',
          id: '12345',
          indexPatternId: 'id',
          scalingType: 'TOP_HITS',
          applyForceRefresh: true,
          sortField: '',
          sortOrder: 'desc',
          tooltipProperties: [
            'host.name',
            'server.ip',
            'server.domain',
            'server.geo.country_iso_code',
            'server.as.organization.name',
          ],
          topHitsSize: 1,
          topHitsSplitField: 'server.ip',
          type: 'ES_SEARCH',
        },
        style: {
          isTimeAware: true,
          properties: {
            fillColor: {
              options: {
                color: '#D36086',
              },
              type: 'STATIC',
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
                size: 8,
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
            labelText: {
              options: {
                value: '',
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#FFFFFF',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                size: 2,
              },
              type: 'STATIC',
            },
            symbolizeAs: {
              options: {
                value: 'icon',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
      {
        __dataRequests: [],
        alpha: 0.75,
        id: '12345',
        includeInFitToBounds: true,
        joins: [],
        label: 'traces-apm-opbean-node | Line',
        maxZoom: 24,
        minZoom: 0,
        sourceDescriptor: {
          applyGlobalQuery: true,
          applyGlobalTime: true,
          destGeoField: 'server.geo.location',
          id: '12345',
          indexPatternId: 'id',
          metrics: [
            {
              field: 'client.bytes',
              type: 'sum',
            },
            {
              field: 'server.bytes',
              type: 'sum',
            },
          ],
          applyForceRefresh: true,
          sourceGeoField: 'client.geo.location',
          type: 'ES_PEW_PEW',
        },
        style: {
          isTimeAware: true,
          properties: {
            fillColor: {
              options: {
                color: '#54B399',
              },
              type: 'STATIC',
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
            labelText: {
              options: {
                value: '',
              },
              type: 'STATIC',
            },
            lineColor: {
              options: {
                color: '#6092C0',
              },
              type: 'STATIC',
            },
            lineWidth: {
              options: {
                field: {
                  name: 'doc_count',
                  origin: 'source',
                },
                fieldMetaOptions: {
                  isEnabled: true,
                  sigma: 3,
                },
                maxSize: 8,
                minSize: 1,
              },
              type: 'DYNAMIC',
            },
            symbolizeAs: {
              options: {
                value: 'circle',
              },
            },
          },
          type: 'VECTOR',
        },
        type: 'GEOJSON_VECTOR',
        visible: true,
      },
    ]);
  });
});
