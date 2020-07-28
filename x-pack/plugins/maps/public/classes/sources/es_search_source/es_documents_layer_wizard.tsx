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

export function createDefaultLayerDescriptor(sourceConfig: unknown, mapColors: string[]) {
  const sourceDescriptor = ESSearchSource.createDescriptor(sourceConfig);

  return sourceDescriptor.scalingType === SCALING_TYPES.CLUSTERS
    ? BlendedVectorLayer.createDescriptor({ sourceDescriptor }, mapColors)
    : VectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
}

export const esDocumentsLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.esSearchDescription', {
    defaultMessage: 'Points, lines, and polygons from Elasticsearch',
  }),
  icon: 'logoElasticsearch',
  renderWizard: ({ previewLayers, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: unknown) => {
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
