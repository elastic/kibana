/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LAYER_WIZARD_CATEGORY, WIZARD_ID } from '../../../../../common/constants';
import { LayerWizard, RenderWizardArguments } from '../layer_wizard_registry';
import { LayerTemplate } from './layer_template';
import { ChoroplethLayerIcon } from '../icons/cloropleth_layer_icon';

export const choroplethLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.CHOROPLETH,
  order: 10,
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.choropleth.desc', {
    defaultMessage: 'Shaded areas to compare statistics across boundaries',
  }),
  icon: ChoroplethLayerIcon,
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <LayerTemplate {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.choropleth.title', {
    defaultMessage: 'Choropleth',
  }),
};
