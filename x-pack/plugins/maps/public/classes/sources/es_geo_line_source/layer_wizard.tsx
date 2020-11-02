/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { CreateSourceEditor } from './create_source_editor';
import { ESGeoLineSource, GeoLineSourceConfig, geoLineTitle } from './es_geo_line_source';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { ESGeoLineSourceDescriptor } from '../../../../common/descriptor_types';
import {
  COLOR_MAP_TYPE,
  COUNT_PROP_NAME,
  FIELD_ORIGIN,
  LAYER_WIZARD_CATEGORY,
  STYLE_TYPE,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { getDefaultDynamicProperties } from '../../styles/vector/vector_style_defaults';
import { VectorStyle } from '../../styles/vector/vector_style';
import { VectorLayer } from '../../layers/vector_layer/vector_layer';
import { getIsGoldPlus } from '../../../licensed_features';

export const geoLineLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.esGeoLineDescription', {
    defaultMessage: 'Connect points into lines',
  }),
  disabledReason: i18n.translate('xpack.maps.source.esGeoLineDisabledReason', {
    defaultMessage: '{title} requires a Gold license.',
    values: { title: geoLineTitle },
  }),
  icon: 'logoElasticsearch',
  getIsDisabled: () => {
    return !getIsGoldPlus();
  },
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: GeoLineSourceConfig) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const defaultDynamicProperties = getDefaultDynamicProperties();
      const layerDescriptor = VectorLayer.createDescriptor({
        sourceDescriptor: ESGeoLineSource.createDescriptor(sourceConfig),
        style: VectorStyle.createDescriptor({
          [VECTOR_STYLES.LINE_COLOR]: {
            type: STYLE_TYPE.DYNAMIC,
            options: {
              ...(defaultDynamicProperties[VECTOR_STYLES.LINE_COLOR]!
                .options as ColorDynamicOptions),
              field: {
                name: sourceConfig.splitField,
                origin: FIELD_ORIGIN.SOURCE,
              },
              colorCategory: 'palette_30',
              type: COLOR_MAP_TYPE.CATEGORICAL,
            },
          },
          [VECTOR_STYLES.LINE_WIDTH]: {
            type: STYLE_TYPE.STATIC,
            options: {
              size: 2,
            },
          },
        }),
      });
      previewLayers([layerDescriptor]);
    };

    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: geoLineTitle,
};
