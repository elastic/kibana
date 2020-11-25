/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import {
  AggDescriptor,
  ColorDynamicOptions,
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
// @ts-ignore
import { ESGeoGridSource } from '../sources/es_geo_grid_source';
import { VectorLayer } from './vector_layer/vector_layer';
import { getDefaultDynamicProperties } from '../styles/vector/vector_style_defaults';
import { NUMERICAL_COLOR_PALETTES } from '../styles/color_palettes';
import { getJoinAggKey } from '../../../common/get_agg_key';

const defaultDynamicProperties = getDefaultDynamicProperties();

export function createAggDescriptor(metricAgg: string, metricFieldName?: string): AggDescriptor {
  const aggTypeKey = Object.keys(AGG_TYPE).find((key) => {
    return AGG_TYPE[key as keyof typeof AGG_TYPE] === metricAgg;
  });
  const aggType = aggTypeKey ? AGG_TYPE[aggTypeKey as keyof typeof AGG_TYPE] : undefined;

  return aggType && metricFieldName
    ? { type: aggType, field: metricFieldName }
    : { type: AGG_TYPE.COUNT };
}

export function createRegionMapLayerDescriptor({
  label,
  emsLayerId,
  leftFieldName,
  termsFieldName,
  colorSchema,
  indexPatternId,
  indexPatternTitle,
  metricAgg,
  metricFieldName,
}: {
  label: string;
  emsLayerId?: string;
  leftFieldName?: string;
  termsFieldName?: string;
  colorSchema: string;
  indexPatternId?: string;
  indexPatternTitle?: string;
  metricAgg: string;
  metricFieldName?: string;
}): LayerDescriptor | null {
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
  return VectorLayer.createDescriptor({
    label,
    joins: [
      {
        leftField: leftFieldName,
        right: {
          type: SOURCE_TYPES.ES_TERM_SOURCE,
          id: joinId,
          indexPatternId,
          indexPatternTitle: indexPatternTitle ? indexPatternTitle : indexPatternId,
          term: termsFieldName,
          metrics: [metricsDescriptor],
          applyGlobalQuery: true,
          applyGlobalTime: true,
        },
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
          ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR]!.options as ColorDynamicOptions),
          field: {
            name: joinKey,
            origin: FIELD_ORIGIN.JOIN,
          },
          color: colorPallette ? colorPallette.value : 'Yellow to Red',
          type: COLOR_MAP_TYPE.ORDINAL,
          fieldMetaOptions: {
            ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR]!.options as ColorDynamicOptions)
              .fieldMetaOptions,
            isEnabled: false,
          },
        },
      },
    }),
  });
}
