/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import uuid from 'uuid/v4';
import {
  AGG_TYPE,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { getJoinAggKey, getSourceAggKey } from '../../../../common/get_agg_key';
import {
  ColorDynamicOptions,
  EMSFileSourceDescriptor,
  ESSearchSourceDescriptor,
  JoinDescriptor,
} from '../../../../common/descriptor_types';
import { VectorStyle } from '../../styles/vector/vector_style';
import { VectorLayer } from '../vector_layer/vector_layer';
import { EMSFileSource } from '../../sources/ems_file_source';
import { getDefaultDynamicProperties } from '../../styles/vector/vector_style_defaults';

const defaultDynamicProperties = getDefaultDynamicProperties();

function createChoroplethLayerDescriptor({
  sourceDescriptor,
  leftField,
  rightIndexPatternId,
  rightIndexPatternTitle,
  rightTermField,
}: {
  sourceDescriptor: EMSFileSourceDescriptor | ESSearchSourceDescriptor;
  leftField: string;
  rightIndexPatternId: string;
  rightIndexPatternTitle: string;
  rightTermField: string;
}) {
  const metricsDescriptor = { type: AGG_TYPE.COUNT };
  const joinId = uuid();
  const joinKey = getJoinAggKey({
    aggType: metricsDescriptor.type,
    aggFieldName: metricsDescriptor.field ? metricsDescriptor.field : '',
    rightSourceId: joinId,
  });
  return VectorLayer.createDescriptor({
    joins: [
      {
        leftField,
        right: {
          type: SOURCE_TYPES.ES_TERM_SOURCE,
          id: joinId,
          indexPatternId: rightIndexPatternId,
          indexPatternTitle: rightIndexPatternTitle,
          term: rightTermField,
          metrics: [metricsDescriptor],
        },
      },
    ],
    sourceDescriptor,
    style: VectorStyle.createDescriptor({
      [VECTOR_STYLES.FILL_COLOR]: {
        type: STYLE_TYPE.DYNAMIC,
        options: {
          ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR]!.options as ColorDynamicOptions),
          field: {
            name: joinKey,
            origin: FIELD_ORIGIN.JOIN,
          },
          color: 'Yellow to Red',
          type: COLOR_MAP_TYPE.ORDINAL,
        },
      },
      [VECTOR_STYLES.LINE_COLOR]: {
        type: STYLE_TYPE.STATIC,
        options: {
          color: '#3d3d3d',
        },
      },
    }),
  });
}

export function createEmsChoroplethLayerDescriptor({
  emsFileId,
  emsField,
  rightIndexPatternId,
  rightIndexPatternTitle,
  rightTermField,
}: {
  emsFileId: string;
  emsField: string;
  rightIndexPatternId: string;
  rightIndexPatternTitle: string;
  rightTermField: string;
}) {
  return createChoroplethLayerDescriptor({
    sourceDescriptor: EMSFileSource.createDescriptor({
      id: emsFileId,
      tooltipProperties: [emsField],
    }),
    leftField: emsField,
    rightIndexPatternId,
    rightIndexPatternTitle,
    rightTermField,
  });
}
