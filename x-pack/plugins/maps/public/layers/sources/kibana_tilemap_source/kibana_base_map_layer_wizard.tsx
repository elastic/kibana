/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
// @ts-ignore
import { KibanaTilemapSource, sourceTitle } from './kibana_tilemap_source';
import { TileLayer } from '../../tile_layer';
// @ts-ignore
import { getKibanaTileMap } from '../../../meta';

export const kibanaBasemapLayerWizardConfig: LayerWizard = {
  checkVisibility: () => {
    const tilemap = getKibanaTileMap();
    return !!tilemap.url;
  },
  description: i18n.translate('xpack.maps.source.kbnTMSDescription', {
    defaultMessage: 'Tile map service configured in kibana.yml',
  }),
  icon: 'logoKibana',
  renderWizard: ({ previewLayer }: RenderWizardArguments) => {
    const onSourceConfigChange = () => {
      const layerDescriptor = TileLayer.createDescriptor({
        sourceDescriptor: KibanaTilemapSource.createDescriptor(),
      });
      previewLayer(layerDescriptor);
    };
    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
