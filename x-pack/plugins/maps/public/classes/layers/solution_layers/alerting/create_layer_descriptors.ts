/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { euiPaletteColorBlind } from '@elastic/eui';
import {
  LayerDescriptor,
  VectorStylePropertiesDescriptor,
} from '../../../../../common/descriptor_types';
import {
  SCALING_TYPES,
  STYLE_TYPE,
  SYMBOLIZE_AS_TYPES,
  VECTOR_STYLES,
} from '../../../../../common/constants';
import { VectorLayer } from '../../vector_layer';
import { VectorStyle } from '../../../styles/vector/vector_style';
// @ts-ignore
import { ESSearchSource } from '../../../sources/es_search_source';

const euiVisColorPalette = euiPaletteColorBlind();

function createSourceLayerDescriptor(indexPatternId: string, indexPatternTitle: string) {
  const sourceDescriptor = ESSearchSource.createDescriptor({
    indexPatternId,
    geoField: 'entityLocation',
    scalingType: SCALING_TYPES.TOP_HITS,
    topHitsSplitField: 'entityId',
    tooltipProperties: [
      'alertId',
      'entityId',
      'entityDateTime',
      'entityDocumentId',
      'detectionDateTime',
      'containingBoundaryId',
      'containingBoundaryName',
    ],
  });

  const styleProperties: Partial<VectorStylePropertiesDescriptor> = {
    [VECTOR_STYLES.FILL_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: { color: '#FF0000' },
    },
    [VECTOR_STYLES.LINE_COLOR]: {
      type: STYLE_TYPE.STATIC,
      options: { color: '#FFFFFF' },
    },
    [VECTOR_STYLES.LINE_WIDTH]: { type: STYLE_TYPE.STATIC, options: { size: 3 } },
    [VECTOR_STYLES.SYMBOLIZE_AS]: {
      options: { value: SYMBOLIZE_AS_TYPES.ICON },
    },
    [VECTOR_STYLES.ICON]: {
      type: STYLE_TYPE.STATIC,
      options: { value: 'star' },
    },
    [VECTOR_STYLES.ICON_SIZE]: { type: STYLE_TYPE.STATIC, options: { size: 10 } },
  };

  return VectorLayer.createDescriptor({
    label: i18n.translate('xpack.maps.alerting.sourceLayerLabel', {
      defaultMessage: '{indexPatternTitle} | Containment alerts',
      values: { indexPatternTitle },
    }),
    sourceDescriptor,
    style: VectorStyle.createDescriptor(styleProperties),
  });
}

export function createAlertingLayerDescriptors(
  indexPatternId: string,
  indexPatternTitle: string
): LayerDescriptor[] {
  return [createSourceLayerDescriptor(indexPatternId, indexPatternTitle)];
}
