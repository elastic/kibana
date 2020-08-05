/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
// @ts-ignore
import { WMSCreateSourceEditor } from './wms_create_source_editor';
// @ts-ignore
import { sourceTitle, WMSSource } from './wms_source';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { TileLayer } from '../../layers/tile_layer/tile_layer';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';

export const wmsLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  description: i18n.translate('xpack.maps.source.wmsDescription', {
    defaultMessage: 'Maps from OGC Standard WMS',
  }),
  icon: 'grid',
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: unknown) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const layerDescriptor = TileLayer.createDescriptor({
        sourceDescriptor: WMSSource.createDescriptor(sourceConfig),
      });
      previewLayers([layerDescriptor]);
    };
    return <WMSCreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
