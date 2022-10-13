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
import { ESGeoGridSource, heatmapTitle } from './es_geo_grid_source';
import { LayerWizard, RenderWizardArguments } from '../../layers';
import { HeatmapLayer } from '../../layers/heatmap_layer';
import { ESGeoGridSourceDescriptor } from '../../../../common/descriptor_types';
import {
  GRID_RESOLUTION,
  LAYER_WIZARD_CATEGORY,
  RENDER_AS,
  WIZARD_ID,
} from '../../../../common/constants';
import { HeatmapLayerIcon } from '../../layers/wizards/icons/heatmap_layer_icon';

export const heatmapLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.HEATMAP,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.esGridHeatmapDescription', {
    defaultMessage: 'Geospatial data grouped in grids to show density',
  }),
  icon: HeatmapLayerIcon,
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (sourceConfig: Partial<ESGeoGridSourceDescriptor>) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const layerDescriptor = HeatmapLayer.createDescriptor({
        sourceDescriptor: ESGeoGridSource.createDescriptor({
          ...sourceConfig,
          resolution: GRID_RESOLUTION.SUPER_FINE,
        }),
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
