/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { sourceTitle } from './es_top_hits_source';
import { BlendedVectorLayer } from '../../layers/blended_vector_layer/blended_vector_layer';
import { VectorLayer } from '../../layers/vector_layer';
import { LAYER_WIZARD_CATEGORY, SCALING_TYPES } from '../../../../common/constants';
import { TiledVectorLayer } from '../../layers/tiled_vector_layer/tiled_vector_layer';
import { DocumentsLayerIcon } from '../../layers/icons/documents_layer_icon';
import { ESTopHitsSourceDescriptor } from '../../../../common/descriptor_types';

export const esTopHitsLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.esTopHitsDescription', {
    defaultMessage: 'Display the most relevant documents per entity',
  }),
  icon: DocumentsLayerIcon,
  renderWizard: ({ previewLayers, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: Partial<ESTopHitsSourceDescriptor>) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      // const sourceDescriptor = ESSearchSource.createDescriptor(sourceConfig);
      // VectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      previewLayers([]);
    };
    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
