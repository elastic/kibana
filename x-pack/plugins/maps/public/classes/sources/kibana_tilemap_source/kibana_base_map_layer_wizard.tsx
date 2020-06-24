/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
// @ts-ignore
import { KibanaTilemapSource, sourceTitle } from './kibana_tilemap_source';
import { TileLayer } from '../../layers/tile_layer/tile_layer';
import { getKibanaTileMap } from '../../../meta';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';

export const kibanaBasemapLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  checkVisibility: async () => {
    const tilemap = getKibanaTileMap();
    // @ts-ignore
    return !!tilemap.url;
  },
  description: i18n.translate('xpack.maps.source.kbnTMSDescription', {
    defaultMessage: 'Tile map service configured in kibana.yml',
  }),
  icon: 'logoKibana',
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = () => {
      const layerDescriptor = TileLayer.createDescriptor({
        sourceDescriptor: KibanaTilemapSource.createDescriptor(),
      });
      previewLayers([layerDescriptor]);
    };
    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
