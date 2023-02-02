/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EMSFileSourceDescriptor,
  LayerDescriptor as BaseLayerDescriptor,
  VectorLayerDescriptor as BaseVectorLayerDescriptor,
  VectorStyleDescriptor,
  AGG_TYPE,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  LABEL_BORDER_SIZES,
  LABEL_POSITIONS,
  LAYER_TYPE,
  SOURCE_TYPES,
  STYLE_TYPE,
  SYMBOLIZE_AS_TYPES,
} from '@kbn/maps-plugin/common';
import { v4 as uuidv4 } from 'uuid';
import type { MapsStartApi } from '@kbn/maps-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  CLIENT_GEO_COUNTRY_ISO_CODE,
  TRANSACTION_DURATION,
} from '../../../../../../common/es_fields/apm';
import { APM_STATIC_DATA_VIEW_ID } from '../../../../../../common/data_view_constants';

interface VectorLayerDescriptor extends BaseVectorLayerDescriptor {
  sourceDescriptor: EMSFileSourceDescriptor;
}

const FIELD_NAME = 'apm-service-overview-layer-country';
const COUNTRY_NAME = 'name';
const TRANSACTION_DURATION_COUNTRY = `__kbnjoin__avg_of_transaction.duration.us__${FIELD_NAME}`;

function getLayerStyle(): VectorStyleDescriptor {
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
            name: TRANSACTION_DURATION_COUNTRY,
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
      labelText: {
        type: STYLE_TYPE.DYNAMIC,
        options: {
          field: {
            name: TRANSACTION_DURATION_COUNTRY,
            origin: FIELD_ORIGIN.JOIN,
          },
        },
      },
      labelPosition: {
        options: {
          position: LABEL_POSITIONS.CENTER,
        },
      },
      labelZoomRange: {
        options: {
          useLayerZoomRange: true,
          minZoom: 0,
          maxZoom: 24,
        },
      },
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
}

export async function getLayerList(maps?: MapsStartApi) {
  const basemapLayerDescriptor = maps
    ? await maps.createLayerDescriptors.createBasemapLayerDescriptor()
    : null;

  const pageLoadDurationByCountryLayer: VectorLayerDescriptor = {
    joins: [
      {
        leftField: 'iso2',
        right: {
          type: SOURCE_TYPES.ES_TERM_SOURCE,
          id: FIELD_NAME,
          term: CLIENT_GEO_COUNTRY_ISO_CODE,
          metrics: [
            {
              type: AGG_TYPE.AVG,
              field: TRANSACTION_DURATION,
              label: i18n.translate(
                'xpack.apm.serviceOverview.embeddedMap.metric.label',
                {
                  defaultMessage: 'Page load duration',
                }
              ),
            },
          ],
          indexPatternId: APM_STATIC_DATA_VIEW_ID,
          applyGlobalQuery: true,
          applyGlobalTime: true,
          applyForceRefresh: true,
        },
      },
    ],
    sourceDescriptor: {
      type: SOURCE_TYPES.EMS_FILE,
      id: 'world_countries',
      tooltipProperties: [COUNTRY_NAME],
    },
    style: getLayerStyle(),
    id: uuidv4(),
    label: null,
    minZoom: 0,
    maxZoom: 24,
    alpha: 0.75,
    visible: true,
    type: LAYER_TYPE.GEOJSON_VECTOR,
  };

  return [
    ...(basemapLayerDescriptor ? [basemapLayerDescriptor] : []),
    pageLoadDurationByCountryLayer,
  ] as BaseLayerDescriptor[];
}
