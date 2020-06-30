/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
// @ts-ignore
import { ESGeoGridSource, clustersTitle } from './es_geo_grid_source';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { VectorLayer } from '../../layers/vector_layer/vector_layer';
import {
  ESGeoGridSourceDescriptor,
  ColorDynamicOptions,
  SizeDynamicOptions,
} from '../../../../common/descriptor_types';
import { getDefaultDynamicProperties } from '../../styles/vector/vector_style_defaults';
import { VectorStyle } from '../../styles/vector/vector_style';
import {
  COUNT_PROP_NAME,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  LAYER_WIZARD_CATEGORY,
  RENDER_AS,
  VECTOR_STYLES,
  STYLE_TYPE,
} from '../../../../common/constants';
import { COLOR_GRADIENTS } from '../../styles/color_utils';

export const clustersLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.esGridClustersDescription', {
    defaultMessage: 'Geospatial data grouped in grids with metrics for each gridded cell',
  }),
  icon: 'logoElasticsearch',
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: Partial<ESGeoGridSourceDescriptor>) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const defaultDynamicProperties = getDefaultDynamicProperties();
      const layerDescriptor = VectorLayer.createDescriptor({
        sourceDescriptor: ESGeoGridSource.createDescriptor(sourceConfig),
        style: VectorStyle.createDescriptor({
          // @ts-ignore
          [VECTOR_STYLES.FILL_COLOR]: {
            type: STYLE_TYPE.DYNAMIC,
            options: {
              ...(defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR]!
                .options as ColorDynamicOptions),
              field: {
                name: COUNT_PROP_NAME,
                origin: FIELD_ORIGIN.SOURCE,
              },
              color: COLOR_GRADIENTS[0].value,
              type: COLOR_MAP_TYPE.ORDINAL,
            },
          },
          [VECTOR_STYLES.LINE_COLOR]: {
            type: STYLE_TYPE.STATIC,
            options: {
              color: '#FFF',
            },
          },
          [VECTOR_STYLES.LINE_WIDTH]: {
            type: STYLE_TYPE.STATIC,
            options: {
              size: 0,
            },
          },
          [VECTOR_STYLES.ICON_SIZE]: {
            type: STYLE_TYPE.DYNAMIC,
            options: {
              ...(defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE]!.options as SizeDynamicOptions),
              field: {
                name: COUNT_PROP_NAME,
                origin: FIELD_ORIGIN.SOURCE,
              },
            },
          },
          [VECTOR_STYLES.LABEL_TEXT]: {
            type: STYLE_TYPE.DYNAMIC,
            options: {
              ...defaultDynamicProperties[VECTOR_STYLES.LABEL_TEXT]!.options,
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

    return (
      <CreateSourceEditor
        requestType={RENDER_AS.POINT}
        onSourceConfigChange={onSourceConfigChange}
      />
    );
  },
  title: clustersTitle,
};
