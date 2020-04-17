/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import {
  MVTSingleLayerVectorSourceEditor,
  MVTSingleLayerVectorSourceConfig,
} from './mvt_single_layer_vector_source_editor';
import { MVTSingleLayerVectorSource, sourceTitle } from './mvt_single_layer_vector_source';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
import { SOURCE_TYPES } from '../../../../common/constants';

export const mvtVectorSourceWizardConfig: LayerWizard = {
  description: i18n.translate('xpack.maps.source.mvtVectorSourceWizard', {
    defaultMessage: 'Vector source wizard',
  }),
  icon: 'grid',
  renderWizard: ({ onPreviewSource, inspectorAdapters }: RenderWizardArguments) => {
    const onSourceConfigChange = ({
      urlTemplate,
      layerName,
      minSourceZoom,
      maxSourceZoom,
    }: MVTSingleLayerVectorSourceConfig) => {
      const sourceDescriptor = MVTSingleLayerVectorSource.createDescriptor({
        urlTemplate,
        layerName,
        minSourceZoom,
        maxSourceZoom,
        type: SOURCE_TYPES.MVT_SINGLE_LAYER,
      });
      const source = new MVTSingleLayerVectorSource(sourceDescriptor, inspectorAdapters);
      onPreviewSource(source);
    };
    return <MVTSingleLayerVectorSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
