/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LAYER_WIZARD_CATEGORY } from '../../../../common/constants';
import { LayerWizard, RenderWizardArguments } from '../layer_wizard_registry';
import { LayerTemplate } from './layer_template';

export const choroplethLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH],
  description: i18n.translate('xpack.maps.choropleth.desc', {
    defaultMessage: 'Shaded areas to compare statistics across boundaries',
  }),
  icon: 'logoElasticsearch',
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <LayerTemplate {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.choropleth.title', {
    defaultMessage: 'Choropleth',
  }),
};
