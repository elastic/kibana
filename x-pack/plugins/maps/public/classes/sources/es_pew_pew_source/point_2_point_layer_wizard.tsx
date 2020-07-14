/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { getDefaultDynamicProperties } from '../../styles/vector/vector_style_defaults';
import { VectorLayer } from '../../layers/vector_layer/vector_layer';
// @ts-ignore
import { ESPewPewSource, sourceTitle } from './es_pew_pew_source';
import { VectorStyle } from '../../styles/vector/vector_style';
import {
  FIELD_ORIGIN,
  COUNT_PROP_NAME,
  LAYER_WIZARD_CATEGORY,
  VECTOR_STYLES,
  STYLE_TYPE,
} from '../../../../common/constants';
import { NUMERICAL_COLOR_PALETTES } from '../../styles/color_palettes';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { ColorDynamicOptions, SizeDynamicOptions } from '../../../../common/descriptor_types';

export const point2PointLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.pewPewDescription', {
    defaultMessage: 'Aggregated data paths between the source and destination',
  }),
  icon: 'logoElasticsearch',
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: unknown) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const defaultDynamicProperties = getDefaultDynamicProperties();
      const layerDescriptor = VectorLayer.createDescriptor({
        sourceDescriptor: ESPewPewSource.createDescriptor(sourceConfig),
        style: VectorStyle.createDescriptor({
          [VECTOR_STYLES.LINE_COLOR]: {
            type: STYLE_TYPE.DYNAMIC,
            options: {
              ...(defaultDynamicProperties[VECTOR_STYLES.LINE_COLOR]!
                .options as ColorDynamicOptions),
              field: {
                name: COUNT_PROP_NAME,
                origin: FIELD_ORIGIN.SOURCE,
              },
              color: NUMERICAL_COLOR_PALETTES[0].value,
            },
          },
          [VECTOR_STYLES.LINE_WIDTH]: {
            type: STYLE_TYPE.DYNAMIC,
            options: {
              ...(defaultDynamicProperties[VECTOR_STYLES.LINE_WIDTH]!
                .options as SizeDynamicOptions),
              field: {
                name: COUNT_PROP_NAME,
                origin: FIELD_ORIGIN.SOURCE,
              },
            },
          },
        }),
      });
      previewLayers([layerDescriptor]);
    };

    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
