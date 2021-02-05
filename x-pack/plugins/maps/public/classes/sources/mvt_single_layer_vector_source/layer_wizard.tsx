/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { MVTSingleLayerVectorSourceEditor } from './mvt_single_layer_vector_source_editor';
import { MVTSingleLayerVectorSource, sourceTitle } from './mvt_single_layer_vector_source';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { TiledVectorLayer } from '../../layers/tiled_vector_layer/tiled_vector_layer';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';
import { TiledSingleLayerVectorSourceSettings } from '../../../../common/descriptor_types';
import { VectorTileLayerIcon } from '../../layers/icons/vector_tile_layer_icon';

export const mvtVectorSourceWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  description: i18n.translate('xpack.maps.source.mvtVectorSourceWizard', {
    defaultMessage: 'Data service implementing the Mapbox vector tile specification',
  }),
  icon: VectorTileLayerIcon,
  renderWizard: ({ previewLayers, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: TiledSingleLayerVectorSourceSettings) => {
      const sourceDescriptor = MVTSingleLayerVectorSource.createDescriptor(sourceConfig);
      const layerDescriptor = TiledVectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      previewLayers([layerDescriptor]);
    };

    return <MVTSingleLayerVectorSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
