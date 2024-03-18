/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { CreateSourceEditor } from './create_source_editor';
import { LayerWizard, RenderWizardArguments } from '../../layers';
import { sourceTitle, ESQLSource } from './esql_source';
import { LAYER_WIZARD_CATEGORY, WIZARD_ID } from '../../../../common/constants';
import type { ESQLSourceDescriptor } from '../../../../common/descriptor_types';
import { GeoJsonVectorLayer } from '../../layers/vector_layer';
import { DocumentsLayerIcon } from '../../layers/wizards/icons/documents_layer_icon';

export const esqlLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.ESQL,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.esqlDescription', {
    defaultMessage: 'Create a layer using the Elasticsearch Query Language',
  }),
  icon: DocumentsLayerIcon,
  isBeta: true,
  renderWizard: ({ previewLayers, mapColors, mostCommonDataViewId }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: Partial<ESQLSourceDescriptor> | null) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const sourceDescriptor = ESQLSource.createDescriptor(sourceConfig);
      const layerDescriptor = GeoJsonVectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      previewLayers([layerDescriptor]);
    };

    return (
      <CreateSourceEditor
        mostCommonDataViewId={mostCommonDataViewId}
        onSourceConfigChange={onSourceConfigChange}
      />
    );
  },
  title: sourceTitle,
};
