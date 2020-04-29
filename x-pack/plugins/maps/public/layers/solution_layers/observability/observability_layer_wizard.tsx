/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
import { ObservabilityLayerTemplate } from './observability_layer_template';

export const ObservabilityLayerWizardConfig: LayerWizard = {
  description: i18n.translate('xpack.maps.observability.desc', {
    defaultMessage: 'Observability layers',
  }),
  icon: 'logoObservability',
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <ObservabilityLayerTemplate {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.observability.title', {
    defaultMessage: 'Observability',
  }),
};
