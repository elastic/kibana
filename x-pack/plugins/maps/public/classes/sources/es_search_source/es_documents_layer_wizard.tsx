/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
// @ts-ignore
import { ESSearchSource, sourceTitle } from './es_search_source';
import { BlendedVectorLayer } from '../../layers/blended_vector_layer/blended_vector_layer';
import { VectorLayer } from '../../layers/vector_layer/vector_layer';
import { LAYER_WIZARD_CATEGORY, SCALING_TYPES } from '../../../../common/constants';
import { TiledVectorLayer } from '../../layers/tiled_vector_layer/tiled_vector_layer';
import { EsDocumentsLayerIcon } from './es_documents_layer_icon';
import {
  ESSearchSourceDescriptor,
  VectorLayerDescriptor,
} from '../../../../common/descriptor_types';

export function createDefaultLayerDescriptor(
  sourceConfig: Partial<ESSearchSourceDescriptor>,
  mapColors: string[]
): VectorLayerDescriptor {
  const sourceDescriptor = ESSearchSource.createDescriptor(sourceConfig);

  if (sourceDescriptor.scalingType === SCALING_TYPES.CLUSTERS) {
    return BlendedVectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
  } else if (sourceDescriptor.scalingType === SCALING_TYPES.MVT) {
    return TiledVectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
  } else {
    return VectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
  }
}

export const esDocumentsLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.esSearchDescription', {
    defaultMessage: 'Points, lines, and polygons from Elasticsearch',
  }),
  icon: EsDocumentsLayerIcon,
  renderWizard: ({ previewLayers, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: Partial<ESSearchSourceDescriptor>) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      previewLayers([createDefaultLayerDescriptor(sourceConfig, mapColors)]);
    };
    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
