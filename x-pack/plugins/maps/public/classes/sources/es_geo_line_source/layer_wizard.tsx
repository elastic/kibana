/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { CreateSourceEditor } from './create_source_editor';
import { ESGeoLineSource, geoLineTitle, REQUIRES_GOLD_LICENSE_MSG } from './es_geo_line_source';
import { LayerWizard, RenderWizardArguments } from '../../layers';
import {
  LAYER_WIZARD_CATEGORY,
  STYLE_TYPE,
  VECTOR_STYLES,
  WIZARD_ID,
} from '../../../../common/constants';
import { VectorStyle } from '../../styles/vector/vector_style';
import { GeoJsonVectorLayer } from '../../layers/vector_layer';
import { getIsGoldPlus } from '../../../licensed_features';
import { TracksLayerIcon } from '../../layers/wizards/icons/tracks_layer_icon';

export const geoLineLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.GEO_LINE,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.source.esGeoLineDescription', {
    defaultMessage: 'Create lines from points',
  }),
  disabledReason: REQUIRES_GOLD_LICENSE_MSG,
  icon: TracksLayerIcon,
  getIsDisabled: () => {
    return !getIsGoldPlus();
  },
  renderWizard: ({ previewLayers }: RenderWizardArguments) => {
    const onSourceConfigChange = (
      sourceConfig: {
        indexPatternId: string;
        geoField: string;
        splitField: string;
        sortField: string;
      } | null
    ) => {
      if (!sourceConfig) {
        previewLayers([]);
        return;
      }

      const layerDescriptor = GeoJsonVectorLayer.createDescriptor({
        sourceDescriptor: ESGeoLineSource.createDescriptor(sourceConfig),
        style: VectorStyle.createDescriptor({
          [VECTOR_STYLES.LINE_WIDTH]: {
            type: STYLE_TYPE.STATIC,
            options: {
              size: 2,
            },
          },
        }),
      });
      layerDescriptor.alpha = 1;
      previewLayers([layerDescriptor]);
    };

    return <CreateSourceEditor onSourceConfigChange={onSourceConfigChange} />;
  },
  title: geoLineTitle,
};
