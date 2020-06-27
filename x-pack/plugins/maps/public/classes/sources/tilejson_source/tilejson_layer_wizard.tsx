/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { TiledVectorLayer } from '../../layers/tiled_vector_layer/tiled_vector_layer';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';
import { TileJsonSourceEditor } from './tilejson_source_editor';
import {
  TileJsonVectorSourceDescriptor,
  TileJsonVectorSourceSettings,
} from '../../../../common/descriptor_types';
import { TileJsonSource, tilejsonSourceTitle } from './tilejson_source';

export const tileJsonLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  description: i18n.translate('xpack.maps.source.tilejsonSourceWizard', {
    defaultMessage:
      'Data service implementing the TileJSON 2.0.0 specification, with vector_layers extension',
  }),
  icon: 'grid',
  renderWizard: ({ previewLayers, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: TileJsonVectorSourceSettings) => {
      const sourceDescriptor: TileJsonVectorSourceDescriptor = TileJsonSource.createDescriptor(
        sourceConfig
      );
      const layerDescriptor = TiledVectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      previewLayers([layerDescriptor]);
    };

    return <TileJsonSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: tilejsonSourceTitle,
};
