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
import { LayerWizard, RenderWizardArguments } from '../../layers';
import { MvtVectorLayer } from '../../layers/vector_layer';
import { LAYER_WIZARD_CATEGORY, WIZARD_ID } from '../../../../common/constants';
import { TiledSingleLayerVectorSourceSettings } from '../../../../common/descriptor_types';
import { VectorTileLayerIcon } from '../../layers/wizards/icons/vector_tile_layer_icon';

export const mvtVectorSourceWizardConfig: LayerWizard = {
  id: WIZARD_ID.MVT_VECTOR,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  description: i18n.translate('xpack.maps.source.mvtVectorSourceWizard', {
    defaultMessage: 'Data service implementing the Mapbox vector tile specification',
  }),
  icon: VectorTileLayerIcon,
  renderWizard: ({ previewLayers, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: TiledSingleLayerVectorSourceSettings) => {
      const sourceDescriptor = MVTSingleLayerVectorSource.createDescriptor(sourceConfig);
      const layerDescriptor = MvtVectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      previewLayers([layerDescriptor]);
    };

    return <MVTSingleLayerVectorSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
