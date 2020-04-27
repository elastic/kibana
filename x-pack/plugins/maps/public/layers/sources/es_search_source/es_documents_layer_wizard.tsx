/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
// @ts-ignore
import { ESSearchSource, sourceTitle } from './es_search_source';
import { BlendedVectorLayer } from '../../blended_vector_layer';
import { VectorLayer } from '../../vector_layer';
import { SCALING_TYPES } from '../../../../common/constants';

export function createDefaultLayerDescriptor(sourceConfig: unknown, mapColors: string[]) {
  const sourceDescriptor = ESSearchSource.createDescriptor(sourceConfig);

  return sourceDescriptor.scalingType === SCALING_TYPES.CLUSTERS
    ? BlendedVectorLayer.createDescriptor({ sourceDescriptor }, mapColors)
    : VectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
}

export const esDocumentsLayerWizardConfig: LayerWizard = {
  description: i18n.translate('xpack.maps.source.esSearchDescription', {
    defaultMessage: 'Vector data from a Kibana index pattern',
  }),
  icon: 'logoElasticsearch',
  renderWizard: ({ previewLayer, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: unknown) => {
      if (!sourceConfig) {
        previewLayer(null);
        return;
      }

      previewLayer(createDefaultLayerDescriptor(sourceConfig, mapColors));
    };
    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: sourceTitle,
};
