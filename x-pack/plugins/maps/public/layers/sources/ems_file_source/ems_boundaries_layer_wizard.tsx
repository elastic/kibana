/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { VectorLayer } from '../../vector_layer';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
// @ts-ignore
import { EMSFileCreateSourceEditor } from './create_source_editor';
// @ts-ignore
import { EMSFileSource, sourceTitle } from './ems_file_source';
// @ts-ignore
import { isEmsEnabled } from '../../../meta';

export const emsBoundariesLayerWizardConfig: LayerWizard = {
  checkVisibility: () => {
    return isEmsEnabled();
  },
  description: i18n.translate('xpack.maps.source.emsFileDescription', {
    defaultMessage: 'Administrative boundaries from Elastic Maps Service',
  }),
  icon: 'emsApp',
  renderWizard: ({ previewLayer, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: unknown) => {
      // @ts-ignore
      const sourceDescriptor = EMSFileSource.createDescriptor(sourceConfig);
      const layerDescriptor = VectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      previewLayer(layerDescriptor);
    };
    return <EMSFileCreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
