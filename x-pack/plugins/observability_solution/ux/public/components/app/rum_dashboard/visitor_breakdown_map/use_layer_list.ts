/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getStaticDataViewId } from '@kbn/apm-data-view';
import {
  AGG_TYPE,
  COLOR_MAP_TYPE,
  EMSFileSourceDescriptor,
  ESTermSourceDescriptor,
  FIELD_ORIGIN,
  LABEL_BORDER_SIZES,
  LABEL_POSITIONS,
  LayerDescriptor as BaseLayerDescriptor,
  LAYER_TYPE,
  SOURCE_TYPES,
  STYLE_TYPE,
  SYMBOLIZE_AS_TYPES,
  VectorLayerDescriptor as BaseVectorLayerDescriptor,
  VectorStyleDescriptor,
} from '@kbn/maps-plugin/common';

import { useMemo } from 'react';
import { SERVICE_NAME, TRANSACTION_TYPE } from '../../../../../common/elasticsearch_fieldnames';
import { TRANSACTION_PAGE_LOAD } from '../../../../../common/transaction_types';
import { useLegacyUrlParams } from '../../../../context/url_params_context/use_url_params';
import { useUxPluginContext } from '../../../../context/use_ux_plugin_context';

const getWhereQuery = (serviceName: string) => {
  return {
    query: `${TRANSACTION_TYPE} : "${TRANSACTION_PAGE_LOAD}" and ${SERVICE_NAME} : "${serviceName}"`,
    language: 'kuery',
  };
};

export const REGION_NAME = 'region_name';
export const COUNTRY_NAME = 'name';

export const TRANSACTION_DURATION_REGION =
  '__kbnjoin__avg_of_transaction.duration.us__e62a1b9c-d7ff-4fd4-a0f6-0fdc44bb9e41';

export const TRANSACTION_DURATION_COUNTRY =
  '__kbnjoin__avg_of_transaction.duration.us__3657625d-17b0-41ef-99ba-3a2b2938655c';

interface VectorLayerDescriptor extends BaseVectorLayerDescriptor {
  sourceDescriptor: EMSFileSourceDescriptor;
}

export function useLayerList() {
  const { urlParams } = useLegacyUrlParams();
  const { spaceId } = useUxPluginContext();

  const { esTermSourceCountry, esTermSourceRegion } = useMemo(() => {
    const _esTermSourceCountry: ESTermSourceDescriptor = {
      type: SOURCE_TYPES.ES_TERM_SOURCE,
      id: '3657625d-17b0-41ef-99ba-3a2b2938655c',
      term: 'client.geo.country_iso_code',
      metrics: [
        {
          type: AGG_TYPE.AVG,
          field: 'transaction.duration.us',
          label: 'Page load duration',
        },
      ],
      indexPatternId: getStaticDataViewId(spaceId),
      applyGlobalQuery: true,
      applyGlobalTime: true,
      applyForceRefresh: true,
    };

    const _esTermSourceRegion: ESTermSourceDescriptor = {
      type: SOURCE_TYPES.ES_TERM_SOURCE,
      id: 'e62a1b9c-d7ff-4fd4-a0f6-0fdc44bb9e41',
      term: 'client.geo.region_iso_code',
      metrics: [{ type: AGG_TYPE.AVG, field: 'transaction.duration.us' }],
      whereQuery: {
        query: 'transaction.type : "page-load"',
        language: 'kuery',
      },
      indexPatternId: getStaticDataViewId(spaceId),
      applyGlobalQuery: true,
      applyGlobalTime: true,
      applyForceRefresh: true,
    };
    return {
      esTermSourceCountry: _esTermSourceCountry,
      esTermSourceRegion: _esTermSourceRegion,
    };
  }, [spaceId]);

  const { serviceName } = urlParams;

  esTermSourceCountry.whereQuery = getWhereQuery(serviceName!);

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
  };

  const pageLoadDurationByCountryLayer: VectorLayerDescriptor = {
    joins: [
      {
        leftField: 'iso2',
        right: esTermSourceCountry,
      },
    ],
    sourceDescriptor: {
      type: 'EMS_FILE',
      id: 'world_countries',
      tooltipProperties: [COUNTRY_NAME],
    },
    style: getLayerStyle(TRANSACTION_DURATION_COUNTRY),
    id: 'e8d1d974-eed8-462f-be2c-f0004b7619b2',
    label: null,
    minZoom: 0,
    maxZoom: 24,
    alpha: 0.75,
    visible: true,
    type: LAYER_TYPE.GEOJSON_VECTOR,
  };

  esTermSourceRegion.whereQuery = getWhereQuery(serviceName!);

  const pageLoadDurationByAdminRegionLayer: VectorLayerDescriptor = {
    joins: [
      {
        leftField: 'region_iso_code',
        right: esTermSourceRegion,
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
    type: LAYER_TYPE.GEOJSON_VECTOR,
  };

  return [
    pageLoadDurationByCountryLayer,
    pageLoadDurationByAdminRegionLayer,
  ] as BaseLayerDescriptor[];
}
