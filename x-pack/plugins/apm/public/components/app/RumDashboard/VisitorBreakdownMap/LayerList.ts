/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EMSFileSourceDescriptor,
  EMSTMSSourceDescriptor,
  ESTermSourceDescriptor,
  LayerDescriptor as BaseLayerDescriptor,
  VectorLayerDescriptor as BaseVectorLayerDescriptor,
  VectorStyleDescriptor,
} from '../../../../../../maps/common/descriptor_types';
import {
  AGG_TYPE,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  LABEL_BORDER_SIZES,
  STYLE_TYPE,
  SYMBOLIZE_AS_TYPES,
} from '../../../../../../maps/common/constants';

import { APM_STATIC_INDEX_PATTERN_ID } from '../../../../../../../../src/plugins/apm_oss/public';

const ES_TERM_SOURCE: ESTermSourceDescriptor = {
  type: 'ES_TERM_SOURCE',
  id: '3657625d-17b0-41ef-99ba-3a2b2938655c',
  indexPatternTitle: 'apm-*',
  term: 'client.geo.country_iso_code',
  metrics: [
    {
      type: AGG_TYPE.AVG,
      field: 'transaction.duration.us',
      label: 'Page load duration',
    },
  ],
  indexPatternId: APM_STATIC_INDEX_PATTERN_ID,
  applyGlobalQuery: true,
};

export const REGION_NAME = 'region_name';
export const COUNTRY_NAME = 'name';

export const TRANSACTION_DURATION_REGION =
  '__kbnjoin__avg_of_transaction.duration.us__e62a1b9c-d7ff-4fd4-a0f6-0fdc44bb9e41';

export const TRANSACTION_DURATION_COUNTRY =
  '__kbnjoin__avg_of_transaction.duration.us__3657625d-17b0-41ef-99ba-3a2b2938655c';

interface LayerDescriptor extends BaseLayerDescriptor {
  sourceDescriptor: EMSTMSSourceDescriptor;
}

interface VectorLayerDescriptor extends BaseVectorLayerDescriptor {
  sourceDescriptor: EMSFileSourceDescriptor;
}

export function getLayerList() {
  const baseLayer: LayerDescriptor = {
    sourceDescriptor: { type: 'EMS_TMS', isAutoSelect: true },
    id: 'b7af286d-2580-4f47-be93-9653d594ce7e',
    label: null,
    minZoom: 0,
    maxZoom: 24,
    alpha: 1,
    visible: true,
    style: { type: 'TILE' },
    type: 'VECTOR_TILE',
  };

  const getLayerStyle = (fieldName: string): VectorStyleDescriptor => {
    return {
      type: 'VECTOR',
      properties: {
        icon: { type: STYLE_TYPE.STATIC, options: { value: 'marker' } },
        fillColor: {
          type: STYLE_TYPE.DYNAMIC,
          options: {
            color: 'Blue to Red',
            colorCategory: 'palette_0',
            fieldMetaOptions: { isEnabled: true, sigma: 3 },
            type: COLOR_MAP_TYPE.ORDINAL,
            field: {
              name: fieldName,
              origin: FIELD_ORIGIN.JOIN,
            },
            useCustomColorRamp: false,
          },
        },
        lineColor: {
          type: STYLE_TYPE.DYNAMIC,
          options: { color: '#3d3d3d', fieldMetaOptions: { isEnabled: true } },
        },
        lineWidth: { type: STYLE_TYPE.STATIC, options: { size: 1 } },
        iconSize: { type: STYLE_TYPE.STATIC, options: { size: 6 } },
        iconOrientation: {
          type: STYLE_TYPE.STATIC,
          options: { orientation: 0 },
        },
        labelText: { type: STYLE_TYPE.STATIC, options: { value: '' } },
        labelColor: {
          type: STYLE_TYPE.STATIC,
          options: { color: '#000000' },
        },
        labelSize: { type: STYLE_TYPE.STATIC, options: { size: 14 } },
        labelBorderColor: {
          type: STYLE_TYPE.STATIC,
          options: { color: '#FFFFFF' },
        },
        symbolizeAs: { options: { value: SYMBOLIZE_AS_TYPES.CIRCLE } },
        labelBorderSize: { options: { size: LABEL_BORDER_SIZES.SMALL } },
      },
      isTimeAware: true,
    };
  };

  const pageLoadDurationByCountryLayer: VectorLayerDescriptor = {
    joins: [
      {
        leftField: 'iso2',
        right: ES_TERM_SOURCE,
      },
    ],
    sourceDescriptor: {
      type: 'EMS_FILE',
      id: 'world_countries',
      tooltipProperties: [COUNTRY_NAME],
      applyGlobalQuery: true,
    },
    style: getLayerStyle(TRANSACTION_DURATION_COUNTRY),
    id: 'e8d1d974-eed8-462f-be2c-f0004b7619b2',
    label: null,
    minZoom: 0,
    maxZoom: 24,
    alpha: 0.75,
    visible: true,
    type: 'VECTOR',
  };

  const pageLoadDurationByAdminRegionLayer: VectorLayerDescriptor = {
    joins: [
      {
        leftField: 'region_iso_code',
        right: {
          type: 'ES_TERM_SOURCE',
          id: 'e62a1b9c-d7ff-4fd4-a0f6-0fdc44bb9e41',
          indexPatternTitle: 'apm-*',
          term: 'client.geo.region_iso_code',
          metrics: [{ type: AGG_TYPE.AVG, field: 'transaction.duration.us' }],
          indexPatternId: APM_STATIC_INDEX_PATTERN_ID,
        },
      },
    ],
    sourceDescriptor: {
      type: 'EMS_FILE',
      id: 'administrative_regions_lvl2',
      tooltipProperties: ['region_iso_code', REGION_NAME],
    },
    style: getLayerStyle(TRANSACTION_DURATION_REGION),
    id: '0e936d41-8765-41c9-97f0-05e166391366',
    label: null,
    minZoom: 3,
    maxZoom: 24,
    alpha: 0.75,
    visible: true,
    type: 'VECTOR',
  };
  return [
    baseLayer,
    pageLoadDurationByCountryLayer,
    pageLoadDurationByAdminRegionLayer,
  ];
}
