/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayerWizard, RenderWizardArguments } from '../../layers';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
// @ts-ignore
import { KibanaTilemapSource, sourceTitle } from './kibana_tilemap_source';
import { RasterTileLayer } from '../../layers/raster_tile_layer/raster_tile_layer';
import { getKibanaTileMap } from '../../../util';
import { LAYER_WIZARD_CATEGORY, WIZARD_ID } from '../../../../common/constants';

export const kibanaBasemapLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.KIBANA_BASEMAP,
  order: 10,
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
      const layerDescriptor = RasterTileLayer.createDescriptor({
        sourceDescriptor: KibanaTilemapSource.createDescriptor(),
      });
      previewLayers([layerDescriptor]);
    };
    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
