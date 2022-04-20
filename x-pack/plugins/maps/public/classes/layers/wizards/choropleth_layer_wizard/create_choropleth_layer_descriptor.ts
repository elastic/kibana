/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import uuid from 'uuid/v4';
import {
  AGG_TYPE,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  SCALING_TYPES,
  SOURCE_TYPES,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../../../common/constants';
import { getJoinAggKey } from '../../../../../common/get_agg_key';
import {
  ColorDynamicOptions,
  CountAggDescriptor,
  EMSFileSourceDescriptor,
  ESSearchSourceDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../../../common/descriptor_types';
import { VectorStyle } from '../../../styles/vector/vector_style';
import { GeoJsonVectorLayer } from '../../vector_layer';
import { EMSFileSource } from '../../../sources/ems_file_source';
// @ts-ignore
import { ESSearchSource } from '../../../sources/es_search_source';
import { getDefaultDynamicProperties } from '../../../styles/vector/vector_style_defaults';

const defaultDynamicProperties = getDefaultDynamicProperties();

function createChoroplethLayerDescriptor({
  sourceDescriptor,
  leftField,
  rightIndexPatternId,
  rightIndexPatternTitle,
  rightTermField,
  setLabelStyle,
}: {
  sourceDescriptor: EMSFileSourceDescriptor | ESSearchSourceDescriptor;
  leftField: string;
  rightIndexPatternId: string;
  rightIndexPatternTitle: string;
  rightTermField: string;
  setLabelStyle: boolean;
}) {
  const metricsDescriptor: CountAggDescriptor = { type: AGG_TYPE.COUNT };
  const joinId = uuid();
  const joinKey = getJoinAggKey({
    aggType: metricsDescriptor.type,
    aggFieldName: '',
    rightSourceId: joinId,
  });

  const styleProperties: Partial<VectorStylePropertiesDescriptor> = {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR].options as ColorDynamicOptions),
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
  };
  if (setLabelStyle) {
    styleProperties[VECTOR_STYLES.LABEL_TEXT] = {
      type: STYLE_TYPE.DYNAMIC,
      options: {
        ...defaultDynamicProperties[VECTOR_STYLES.LABEL_TEXT].options,
        field: {
          name: joinKey,
          origin: FIELD_ORIGIN.JOIN,
        },
      },
    };
  }

  return GeoJsonVectorLayer.createDescriptor({
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
          applyGlobalQuery: true,
          applyGlobalTime: true,
          applyForceRefresh: true,
        },
      },
    ],
    sourceDescriptor,
    style: VectorStyle.createDescriptor(styleProperties),
  });
}

export function createEmsChoroplethLayerDescriptor({
  leftEmsFileId,
  leftEmsField,
  rightIndexPatternId,
  rightIndexPatternTitle,
  rightTermField,
}: {
  leftEmsFileId: string;
  leftEmsField: string;
  rightIndexPatternId: string;
  rightIndexPatternTitle: string;
  rightTermField: string;
}) {
  return createChoroplethLayerDescriptor({
    sourceDescriptor: EMSFileSource.createDescriptor({
      id: leftEmsFileId,
      tooltipProperties: [leftEmsField],
    }),
    leftField: leftEmsField,
    rightIndexPatternId,
    rightIndexPatternTitle,
    rightTermField,
    setLabelStyle: true,
  });
}

export function createEsChoroplethLayerDescriptor({
  leftIndexPatternId,
  leftGeoField,
  leftJoinField,
  rightIndexPatternId,
  rightIndexPatternTitle,
  rightTermField,
}: {
  leftIndexPatternId: string;
  leftGeoField: string;
  leftJoinField: string;
  rightIndexPatternId: string;
  rightIndexPatternTitle: string;
  rightTermField: string;
}) {
  return createChoroplethLayerDescriptor({
    sourceDescriptor: ESSearchSource.createDescriptor({
      indexPatternId: leftIndexPatternId,
      geoField: leftGeoField,
      scalingType: SCALING_TYPES.MVT,
      tooltipProperties: [leftJoinField],
      applyGlobalQuery: false,
      applyGlobalTime: false,
      applyForceRefresh: false,
    }),
    leftField: leftJoinField,
    rightIndexPatternId,
    rightIndexPatternTitle,
    rightTermField,
    setLabelStyle: false, // Styling label by join metric with MVT is not supported
  });
}
