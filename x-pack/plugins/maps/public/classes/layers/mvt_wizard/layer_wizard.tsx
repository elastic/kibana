/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import React from 'react';
import { sourceTitle } from '../../sources/mvt_single_layer_vector_source';
import { LayerWizard, RenderWizardArguments } from '../layers/layer_wizard_registry';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';
import { TileJsonManualWizard } from './tilejson_manual_wizard';

export const mvtVectorSourceWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.REFERENCE],
  description: i18n.translate('xpack.maps.source.mvtVectorSourceWizard', {
    defaultMessage: 'Data service implementing the Mapbox vector tile specification',
  }),
  icon: 'grid',
  renderWizard: ({ previewLayers, mapColors }: RenderWizardArguments) => {
    return <TileJsonManualWizard previewLayers={previewLayers} mapColors={mapColors} />;
  },
  title: sourceTitle,
};
