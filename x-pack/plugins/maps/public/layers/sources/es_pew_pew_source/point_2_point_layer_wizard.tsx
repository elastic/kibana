/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { getDefaultDynamicProperties } from '../../styles/vector/vector_style_defaults';
import { VectorLayer } from '../../vector_layer';
// @ts-ignore
import { ESPewPewSource, sourceTitle } from './es_pew_pew_source';
import { VectorStyle } from '../../styles/vector/vector_style';
import { FIELD_ORIGIN, COUNT_PROP_NAME, VECTOR_STYLES } from '../../../../common/constants';
import { COLOR_GRADIENTS } from '../../styles/color_utils';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
import { DynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';

export const point2PointLayerWizardConfig: LayerWizard = {
  description: i18n.translate('xpack.maps.source.pewPewDescription', {
    defaultMessage: 'Aggregated data paths between the source and destination',
  }),
  icon: 'logoElasticsearch',
  renderWizard: ({ previewLayer }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: unknown) => {
      if (!sourceConfig) {
        previewLayer(null);
        return;
      }

      const defaultDynamicProperties = getDefaultDynamicProperties();
      const layerDescriptor = VectorLayer.createDescriptor({
        sourceDescriptor: ESPewPewSource.createDescriptor(sourceConfig),
        style: VectorStyle.createDescriptor({
          [VECTOR_STYLES.LINE_COLOR]: {
            type: DynamicStyleProperty.type,
            options: {
              ...defaultDynamicProperties[VECTOR_STYLES.LINE_COLOR].options,
              field: {
                name: COUNT_PROP_NAME,
                origin: FIELD_ORIGIN.SOURCE,
              },
              color: COLOR_GRADIENTS[0].value,
            },
          },
          [VECTOR_STYLES.LINE_WIDTH]: {
            type: DynamicStyleProperty.type,
            options: {
              ...defaultDynamicProperties[VECTOR_STYLES.LINE_WIDTH].options,
              field: {
                name: COUNT_PROP_NAME,
                origin: FIELD_ORIGIN.SOURCE,
              },
            },
          },
        }),
      });
      previewLayer(layerDescriptor);
    };

    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
