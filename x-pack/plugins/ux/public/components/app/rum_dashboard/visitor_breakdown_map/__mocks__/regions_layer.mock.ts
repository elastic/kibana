/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const mockLayerList = [
  {
    joins: [
      {
        leftField: 'iso2',
        right: {
          applyForceRefresh: true,
          applyGlobalQuery: true,
          applyGlobalTime: true,
          type: 'ES_TERM_SOURCE',
          id: '3657625d-17b0-41ef-99ba-3a2b2938655c',
          indexPatternTitle: 'apm-*',
          term: 'client.geo.country_iso_code',
          whereQuery: {
            language: 'kuery',
            query:
              'transaction.type : "page-load" and service.name : "undefined"',
          },
          metrics: [
            {
              type: 'avg',
              field: 'transaction.duration.us',
              label: 'Page load duration',
            },
          ],
          indexPatternId: 'apm_static_index_pattern_id',
        },
      },
    ],
    sourceDescriptor: {
      type: 'EMS_FILE',
      id: 'world_countries',
      tooltipProperties: ['name'],
    },
    style: {
      type: 'VECTOR',
      properties: {
        icon: { type: 'STATIC', options: { value: 'marker' } },
        fillColor: {
          type: 'DYNAMIC',
          options: {
            color: 'Blue to Red',
            colorCategory: 'palette_0',
            fieldMetaOptions: { isEnabled: true, sigma: 3 },
            type: 'ORDINAL',
            field: {
              name: '__kbnjoin__avg_of_transaction.duration.us__3657625d-17b0-41ef-99ba-3a2b2938655c',
              origin: 'join',
            },
            useCustomColorRamp: false,
          },
        },
        lineColor: {
          type: 'DYNAMIC',
          options: { color: '#3d3d3d', fieldMetaOptions: { isEnabled: true } },
        },
        lineWidth: { type: 'STATIC', options: { size: 1 } },
        iconSize: { type: 'STATIC', options: { size: 6 } },
        iconOrientation: { type: 'STATIC', options: { orientation: 0 } },
        labelText: { type: 'STATIC', options: { value: '' } },
        labelColor: { type: 'STATIC', options: { color: '#000000' } },
        labelSize: { type: 'STATIC', options: { size: 14 } },
        labelBorderColor: { type: 'STATIC', options: { color: '#FFFFFF' } },
        symbolizeAs: { options: { value: 'circle' } },
        labelBorderSize: { options: { size: 'SMALL' } },
      },
      isTimeAware: true,
    },
    id: 'e8d1d974-eed8-462f-be2c-f0004b7619b2',
    label: null,
    minZoom: 0,
    maxZoom: 24,
    alpha: 0.75,
    visible: true,
    type: 'GEOJSON_VECTOR',
  },
  {
    joins: [
      {
        leftField: 'region_iso_code',
        right: {
          applyForceRefresh: true,
          applyGlobalQuery: true,
          applyGlobalTime: true,
          type: 'ES_TERM_SOURCE',
          id: 'e62a1b9c-d7ff-4fd4-a0f6-0fdc44bb9e41',
          indexPatternTitle: 'apm-*',
          term: 'client.geo.region_iso_code',
          whereQuery: {
            language: 'kuery',
            query:
              'transaction.type : "page-load" and service.name : "undefined"',
          },
          metrics: [{ type: 'avg', field: 'transaction.duration.us' }],
          indexPatternId: 'apm_static_index_pattern_id',
        },
      },
    ],
    sourceDescriptor: {
      type: 'EMS_FILE',
      id: 'administrative_regions_lvl2',
      tooltipProperties: ['region_iso_code', 'region_name'],
    },
    style: {
      type: 'VECTOR',
      properties: {
        icon: { type: 'STATIC', options: { value: 'marker' } },
        fillColor: {
          type: 'DYNAMIC',
          options: {
            color: 'Blue to Red',
            colorCategory: 'palette_0',
            fieldMetaOptions: { isEnabled: true, sigma: 3 },
            type: 'ORDINAL',
            field: {
              name: '__kbnjoin__avg_of_transaction.duration.us__e62a1b9c-d7ff-4fd4-a0f6-0fdc44bb9e41',
              origin: 'join',
            },
            useCustomColorRamp: false,
          },
        },
        lineColor: {
          type: 'DYNAMIC',
          options: { color: '#3d3d3d', fieldMetaOptions: { isEnabled: true } },
        },
        lineWidth: { type: 'STATIC', options: { size: 1 } },
        iconSize: { type: 'STATIC', options: { size: 6 } },
        iconOrientation: { type: 'STATIC', options: { orientation: 0 } },
        labelText: { type: 'STATIC', options: { value: '' } },
        labelColor: { type: 'STATIC', options: { color: '#000000' } },
        labelSize: { type: 'STATIC', options: { size: 14 } },
        labelBorderColor: { type: 'STATIC', options: { color: '#FFFFFF' } },
        symbolizeAs: { options: { value: 'circle' } },
        labelBorderSize: { options: { size: 'SMALL' } },
      },
      isTimeAware: true,
    },
    id: '0e936d41-8765-41c9-97f0-05e166391366',
    label: null,
    minZoom: 3,
    maxZoom: 24,
    alpha: 0.75,
    visible: true,
    type: 'GEOJSON_VECTOR',
  },
];
