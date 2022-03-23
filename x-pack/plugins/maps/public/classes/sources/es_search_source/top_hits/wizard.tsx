/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { CreateSourceEditor } from './create_source_editor';
import { LayerWizard, RenderWizardArguments } from '../../../layers';
import { GeoJsonVectorLayer } from '../../../layers/vector_layer';
import { LAYER_WIZARD_CATEGORY, WIZARD_ID } from '../../../../../common/constants';
import { TopHitsLayerIcon } from '../../../layers/wizards/icons/top_hits_layer_icon';
import { ESSearchSourceDescriptor } from '../../../../../common/descriptor_types';
import { ESSearchSource } from '../es_search_source';

export const esTopHitsLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.ES_TOP_HITS,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.topHitsDescription', {
    defaultMessage:
      'Display the most relevant documents per entity, e.g. the most recent GPS hits per vehicle.',
  }),
  icon: TopHitsLayerIcon,
  renderWizard: ({ previewLayers, mapColors }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: Partial<ESSearchSourceDescriptor> | null) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const sourceDescriptor = ESSearchSource.createDescriptor(sourceConfig);
      const layerDescriptor = GeoJsonVectorLayer.createDescriptor({ sourceDescriptor }, mapColors);
      previewLayers([layerDescriptor]);
    };
    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: i18n.translate('xpack.maps.source.topHitsTitle', {
    defaultMessage: 'Top hits per entity',
  }),
};
