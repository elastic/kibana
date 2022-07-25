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
import { LayerWizard, RenderWizardArguments } from '../../layers';
import { ESSearchSource, sourceTitle } from './es_search_source';
import { BlendedVectorLayer, GeoJsonVectorLayer, MvtVectorLayer } from '../../layers/vector_layer';
import { LAYER_WIZARD_CATEGORY, SCALING_TYPES, WIZARD_ID } from '../../../../common/constants';
import { DocumentsLayerIcon } from '../../layers/wizards/icons/documents_layer_icon';
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
    return MvtVectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
  } else {
    return GeoJsonVectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
  }
}

export const esDocumentsLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.ES_DOCUMENT,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.esSearchDescription', {
    defaultMessage: 'Points, lines, and polygons from Elasticsearch',
  }),
  icon: DocumentsLayerIcon,
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
