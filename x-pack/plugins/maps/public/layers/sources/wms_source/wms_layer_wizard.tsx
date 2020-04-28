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
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
import { TileLayer } from '../../tile_layer';

export const wmsLayerWizardConfig: LayerWizard = {
  description: i18n.translate('xpack.maps.source.wmsDescription', {
    defaultMessage: 'Maps from OGC Standard WMS',
  }),
  icon: 'grid',
  renderWizard: ({ previewLayer }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: unknown) => {
      if (!sourceConfig) {
        previewLayer(null);
        return;
      }

      const layerDescriptor = TileLayer.createDescriptor({
        sourceDescriptor: WMSSource.createDescriptor(sourceConfig),
      });
      previewLayer(layerDescriptor);
    };
    return <WMSCreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
