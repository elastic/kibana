/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function getLayerList() {
  return [
    {
      sourceDescriptor: { type: 'EMS_TMS', isAutoSelect: true },
      id: 'b7af286d-2580-4f47-be93-9653d594ce7e',
      label: null,
      minZoom: 0,
      maxZoom: 24,
      alpha: 1,
      visible: true,
      style: { type: 'TILE' },
      type: 'VECTOR_TILE',
    },
    {
      joins: [
        {
          leftField: 'iso2',
          right: {
            type: 'ES_TERM_SOURCE',
            id: '3657625d-17b0-41ef-99ba-3a2b2938655c',
            indexPatternTitle: 'apm-*',
            term: 'client.geo.country_iso_code',
            metrics: [{ type: 'avg', field: 'transaction.duration.us' }],
            indexPatternRefName: 'layer_1_join_0_index_pattern',
          },
        },
      ],
      sourceDescriptor: {
        type: 'EMS_FILE',
        id: 'world_countries',
        tooltipProperties: ['iso2'],
        applyGlobalQuery: true,
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
                name:
                  '__kbnjoin__avg_of_transaction.duration.us__3657625d-17b0-41ef-99ba-3a2b2938655c',
                origin: 'join',
              },
              useCustomColorRamp: false,
            },
          },
          lineColor: {
            type: 'STATIC',
            options: { color: '#3d3d3d' },
          },
          lineWidth: { type: 'STATIC', options: { size: 1 } },
          iconSize: { type: 'STATIC', options: { size: 6 } },
          iconOrientation: {
            type: 'STATIC',
            options: { orientation: 0 },
          },
          labelText: { type: 'STATIC', options: { value: '' } },
          labelColor: {
            type: 'STATIC',
            options: { color: '#000000' },
          },
          labelSize: { type: 'STATIC', options: { size: 14 } },
          labelBorderColor: {
            type: 'STATIC',
            options: { color: '#FFFFFF' },
          },
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
      type: 'VECTOR',
    },
  ];
}
