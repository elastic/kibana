/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
// @ts-ignore
import { CreateSourceEditor } from './create_source_editor';
// @ts-ignore
import { ESGeoGridSource, heatmapTitle } from './es_geo_grid_source';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
// @ts-ignore
import { HeatmapLayer } from '../../layers/heatmap_layer/heatmap_layer';
import { ESGeoGridSourceDescriptor } from '../../../../common/descriptor_types';
import { LAYER_WIZARD_CATEGORY, RENDER_AS } from '../../../../common/constants';

export const heatmapLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.esGridHeatmapDescription', {
    defaultMessage: 'Geospatial data grouped in grids to show density',
  }),
  icon: 'logoElasticsearch',
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: Partial<ESGeoGridSourceDescriptor>) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const layerDescriptor = HeatmapLayer.createDescriptor({
        sourceDescriptor: ESGeoGridSource.createDescriptor(sourceConfig),
      });
      previewLayers([layerDescriptor]);
    };

    return (
      <CreateSourceEditor
        requestType={RENDER_AS.HEATMAP}
        onSourceConfigChange={onSourceConfigChange}
      />
    );
  },
  title: heatmapTitle,
};
