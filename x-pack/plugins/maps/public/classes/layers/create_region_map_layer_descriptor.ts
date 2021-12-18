/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid/v4';
import {
  AggDescriptor,
  ColorDynamicOptions,
  ESTermSourceDescriptor,
  LayerDescriptor,
} from '../../../common/descriptor_types';
import {
  AGG_TYPE,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../common/constants';
import { VectorStyle } from '../styles/vector/vector_style';
import { EMSFileSource } from '../sources/ems_file_source';
import { GeoJsonVectorLayer } from './vector_layer';
import { getDefaultDynamicProperties } from '../styles/vector/vector_style_defaults';
import { NUMERICAL_COLOR_PALETTES } from '../styles/color_palettes';
import { getJoinAggKey } from '../../../common/get_agg_key';

const defaultDynamicProperties = getDefaultDynamicProperties();

export interface CreateRegionMapLayerDescriptorParams {
  label: string;
  emsLayerId?: string;
  leftFieldName?: string;
  termsFieldName?: string;
  termsSize?: number;
  colorSchema: string;
  indexPatternId?: string;
  indexPatternTitle?: string;
  metricAgg: string;
  metricFieldName?: string;
}

export function createAggDescriptor(metricAgg: string, metricFieldName?: string): AggDescriptor {
  const aggTypeKey = Object.keys(AGG_TYPE).find((key) => {
    return AGG_TYPE[key as keyof typeof AGG_TYPE] === metricAgg;
  });
  const aggType = aggTypeKey ? AGG_TYPE[aggTypeKey as keyof typeof AGG_TYPE] : undefined;

  if (!aggType || aggType === AGG_TYPE.COUNT || !metricFieldName) {
    return { type: AGG_TYPE.COUNT };
  } else if (aggType === AGG_TYPE.PERCENTILE) {
    return { type: aggType, field: metricFieldName, percentile: 50 };
  } else {
    return { type: aggType, field: metricFieldName };
  }
}

export function createRegionMapLayerDescriptor({
  label,
  emsLayerId,
  leftFieldName,
  termsFieldName,
  termsSize,
  colorSchema,
  indexPatternId,
  indexPatternTitle,
  metricAgg,
  metricFieldName,
}: CreateRegionMapLayerDescriptorParams): LayerDescriptor | null {
  if (!indexPatternId || !emsLayerId || !leftFieldName || !termsFieldName) {
    return null;
  }

  const metricsDescriptor = createAggDescriptor(metricAgg, metricFieldName);
  const joinId = uuid();
  const joinKey = getJoinAggKey({
    aggType: metricsDescriptor.type,
    aggFieldName: 'field' in metricsDescriptor ? metricsDescriptor.field : '',
    rightSourceId: joinId,
  });
  const colorPallette = NUMERICAL_COLOR_PALETTES.find((pallette) => {
    return pallette.value.toLowerCase() === colorSchema.toLowerCase();
  });
  const termSourceDescriptor: ESTermSourceDescriptor = {
    type: SOURCE_TYPES.ES_TERM_SOURCE,
    id: joinId,
    indexPatternId,
    indexPatternTitle: indexPatternTitle ? indexPatternTitle : indexPatternId,
    term: termsFieldName,
    metrics: [metricsDescriptor],
    applyGlobalQuery: true,
    applyGlobalTime: true,
    applyForceRefresh: true,
  };
  if (termsSize !== undefined) {
    termSourceDescriptor.size = termsSize;
  }
  return GeoJsonVectorLayer.createDescriptor({
    label,
    joins: [
      {
        leftField: leftFieldName,
        right: termSourceDescriptor,
      },
    ],
    sourceDescriptor: EMSFileSource.createDescriptor({
      id: emsLayerId,
      tooltipProperties: ['name', leftFieldName],
    }),
    style: VectorStyle.createDescriptor({
      [VECTOR_STYLES.FILL_COLOR]: {
        type: STYLE_TYPE.DYNAMIC,
        options: {
          ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR].options as ColorDynamicOptions),
          field: {
            name: joinKey,
            origin: FIELD_ORIGIN.JOIN,
          },
          color: colorPallette ? colorPallette.value : 'Yellow to Red',
          type: COLOR_MAP_TYPE.ORDINAL,
          fieldMetaOptions: {
            ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR].options as ColorDynamicOptions)
              .fieldMetaOptions,
            isEnabled: false,
          },
        },
      },
    }),
  });
}
