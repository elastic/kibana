/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
import { RUMLayerTemplate } from './rum_layer_template';

export const RUMLayerWizardConfig: LayerWizard = {
  description: i18n.translate('xpack.maps.observability.rum.desc', {
    defaultMessage: 'Real User Monitoring (RUM)',
  }),
  icon: 'logoObservability',
  renderWizard: ({ previewLayer, mapColors }: RenderWizardArguments) => {
    return <RUMLayerTemplate previewLayer={previewLayer} mapColors={mapColors} />;
  },
  title: i18n.translate('xpack.maps.observability.rum.title', {
    defaultMessage: 'Observability',
  }),
};
