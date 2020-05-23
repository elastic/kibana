/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
// @ts-ignore
import { EMSTMSSource, sourceTitle } from './ems_tms_source';
// @ts-ignore
import { VectorTileLayer } from '../../vector_tile_layer';
// @ts-ignore
import { TileServiceSelect } from './tile_service_select';
// @ts-ignore
import { isEmsEnabled } from '../../../meta';

export const emsBaseMapLayerWizardConfig: LayerWizard = {
  checkVisibility: () => {
    return isEmsEnabled();
  },
  description: i18n.translate('xpack.maps.source.emsTileDescription', {
    defaultMessage: 'Tile map service from Elastic Maps Service',
  }),
  icon: 'emsApp',
  renderWizard: ({ previewLayer }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: unknown) => {
      const layerDescriptor = VectorTileLayer.createDescriptor({
        sourceDescriptor: EMSTMSSource.createDescriptor(sourceConfig),
      });
      previewLayer(layerDescriptor);
    };

    return <TileServiceSelect onTileSelect={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
