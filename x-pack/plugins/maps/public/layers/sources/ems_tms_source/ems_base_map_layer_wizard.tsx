/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
import { EMSTMSSource, sourceTitle } from './ems_tms_source';
import { VectorTileLayer } from '../../vector_tile_layer';
import { TileServiceSelect } from './tile_service_select';

export const emsBaseMapLayerWizardConfig: LayerWizard = {
  description: i18n.translate('xpack.maps.source.emsTileDescription', {
    defaultMessage: 'Tile map service from Elastic Maps Service',
  }),
  icon: 'emsApp',
  renderWizard: ({ previewLayer }: RenderWizardArguments) => {
    const onSourceConfigChange = sourceConfig => {
      const layerDescriptor = VectorTileLayer.createDescriptor({
        sourceDescriptor: EMSTMSSource.createDescriptor(sourceConfig),
      });
      previewLayer(layerDescriptor);
    };

    return <TileServiceSelect onTileSelect={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
