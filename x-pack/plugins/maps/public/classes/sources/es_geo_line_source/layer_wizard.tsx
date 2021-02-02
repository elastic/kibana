/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { CreateSourceEditor } from './create_source_editor';
import { ESGeoLineSource, geoLineTitle, REQUIRES_GOLD_LICENSE_MSG } from './es_geo_line_source';
import { LayerWizard, RenderWizardArguments } from '../../layers/layer_wizard_registry';
import { LAYER_WIZARD_CATEGORY, STYLE_TYPE, VECTOR_STYLES } from '../../../../common/constants';
import { VectorStyle } from '../../styles/vector/vector_style';
import { VectorLayer } from '../../layers/vector_layer/vector_layer';
import { getIsGoldPlus } from '../../../licensed_features';
import { TracksLayerIcon } from '../../layers/icons/tracks_layer_icon';

export const geoLineLayerWizardConfig: LayerWizard = {
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

      const layerDescriptor = VectorLayer.createDescriptor({
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
