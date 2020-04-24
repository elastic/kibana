/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { CreateSourceEditor } from './create_source_editor';
import { ESGeoGridSource, clustersTitle } from './es_geo_grid_source';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
import { VectorLayer } from '../../vector_layer';
import { ESGeoGridSourceDescriptor } from '../../../../common/descriptor_types';
import { getDefaultDynamicProperties } from '../../styles/vector/vector_style_defaults';
import { VectorStyle } from '../../styles/vector/vector_style';
import {
  COUNT_PROP_NAME,
  COLOR_MAP_TYPE,
  FIELD_ORIGIN,
  RENDER_AS,
  VECTOR_STYLES,
} from '../../../../common/constants';
import { DynamicStyleProperty } from '../../styles/vector/properties/dynamic_style_property';
import { StaticStyleProperty } from '../../styles/vector/properties/static_style_property';
import { COLOR_GRADIENTS } from '../../styles/color_utils';

export const clustersLayerWizardConfig: LayerWizard = {
  description: i18n.translate('xpack.maps.source.esGridClustersDescription', {
    defaultMessage: 'Geospatial data grouped in grids with metrics for each gridded cell',
  }),
  icon: 'logoElasticsearch',
  renderWizard: ({ previewLayer }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: Partial<ESGeoGridSourceDescriptor>) => {
      if (!sourceConfig) {
        previewLayer(null);
        return;
      }

      const defaultDynamicProperties = getDefaultDynamicProperties();
      const layerDescriptor = VectorLayer.createDescriptor({
        sourceDescriptor: ESGeoGridSource.createDescriptor(sourceConfig),
        style: VectorStyle.createDescriptor({
          [VECTOR_STYLES.FILL_COLOR]: {
            type: DynamicStyleProperty.type,
            options: {
              ...defaultDynamicProperties[VECTOR_STYLES.FILL_COLOR].options,
              field: {
                name: COUNT_PROP_NAME,
                origin: FIELD_ORIGIN.SOURCE,
              },
              color: COLOR_GRADIENTS[0].value,
              type: COLOR_MAP_TYPE.ORDINAL,
            },
          },
          [VECTOR_STYLES.LINE_COLOR]: {
            type: StaticStyleProperty.type,
            options: {
              color: '#FFF',
            },
          },
          [VECTOR_STYLES.LINE_WIDTH]: {
            type: StaticStyleProperty.type,
            options: {
              size: 0,
            },
          },
          [VECTOR_STYLES.ICON_SIZE]: {
            type: DynamicStyleProperty.type,
            options: {
              ...defaultDynamicProperties[VECTOR_STYLES.ICON_SIZE].options,
              field: {
                name: COUNT_PROP_NAME,
                origin: FIELD_ORIGIN.SOURCE,
              },
            },
          },
          [VECTOR_STYLES.LABEL_TEXT]: {
            type: DynamicStyleProperty.type,
            options: {
              ...defaultDynamicProperties[VECTOR_STYLES.LABEL_TEXT].options,
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

    return (
      <CreateSourceEditor
        requestType={RENDER_AS.POINT}
        onSourceConfigChange={onSourceConfigChange}
      />
    );
  },
  title: clustersTitle,
};
