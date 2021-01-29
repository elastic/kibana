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
import { EMSTMSSource, getSourceTitle } from './ems_tms_source';
// @ts-ignore
import { VectorTileLayer } from '../../layers/vector_tile_layer/vector_tile_layer';
// @ts-ignore
import { TileServiceSelect } from './tile_service_select';
import { getEMSSettings } from '../../../kibana_services';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';
import { WorldMapLayerIcon } from '../../layers/icons/world_map_layer_icon';

function getDescription() {
  const emsSettings = getEMSSettings();
  return i18n.translate('xpack.maps.source.emsTileSourceDescription', {
    defaultMessage: 'Basemap service from {host}',
    values: {
      host: emsSettings.isEMSUrlSet() ? emsSettings.getEMSRoot() : 'Elastic Maps Service',
    },
  });
}

export const emsBaseMapLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  checkVisibility: async () => {
    const emsSettings = getEMSSettings();
    return emsSettings.isIncludeElasticMapsService();
  },
  description: getDescription(),
  disabledReason: i18n.translate('xpack.maps.source.emsTileDisabledReason', {
    defaultMessage: 'Elastic Maps Server requires an Enterprise license',
  }),
  getIsDisabled: () => {
    const emsSettings = getEMSSettings();
    return emsSettings.isEMSUrlSet() && !emsSettings.hasOnPremLicense();
  },
  icon: WorldMapLayerIcon,
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
  title: getSourceTitle(),
};
