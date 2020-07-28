/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiPanel } from '@elastic/eui';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
// @ts-ignore
import { EMSTMSSource, sourceTitle } from './ems_tms_source';
// @ts-ignore
import { VectorTileLayer } from '../../layers/vector_tile_layer/vector_tile_layer';
// @ts-ignore
import { TileServiceSelect } from './tile_service_select';
import { getIsEmsEnabled } from '../../../kibana_services';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';

export const emsBaseMapLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  checkVisibility: () => {
    return getIsEmsEnabled();
  },
  description: i18n.translate('xpack.maps.source.emsTileDescription', {
    defaultMessage: 'Tile map service from Elastic Maps Service',
  }),
  icon: 'emsApp',
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: unknown) => {
      const layerDescriptor = VectorTileLayer.createDescriptor({
        sourceDescriptor: EMSTMSSource.createDescriptor(sourceConfig),
      });
      previewLayers([layerDescriptor]);
    };

    return (
      <EuiPanel>
        <TileServiceSelect onTileSelect={onSourceConfigChange} />
      </EuiPanel>
    );
  },
  title: sourceTitle,
};
