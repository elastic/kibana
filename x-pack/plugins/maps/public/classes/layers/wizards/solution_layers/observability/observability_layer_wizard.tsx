/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LAYER_WIZARD_CATEGORY, WIZARD_ID } from '../../../../../../common/constants';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
import { ObservabilityLayerTemplate } from './observability_layer_template';
import { APM_INDEX_PATTERN_ID } from './create_layer_descriptor';
import { getIndexPatternService } from '../../../../../kibana_services';

export const ObservabilityLayerWizardConfig: LayerWizard = {
  id: WIZARD_ID.OBSERVABILITY,
  order: 20,
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH, LAYER_WIZARD_CATEGORY.SOLUTIONS],
  getIsDisabled: async () => {
    try {
      await getIndexPatternService().get(APM_INDEX_PATTERN_ID);
      return false;
    } catch (e) {
      return true;
    }
  },
  disabledReason: i18n.translate('xpack.maps.observability.disabledDesc', {
    defaultMessage:
      'Cannot find APM data view. To get started with Observably, go to Observability > Overview.',
  }),
  description: i18n.translate('xpack.maps.observability.desc', {
    defaultMessage: 'APM layers',
  }),
  icon: 'logoObservability',
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <ObservabilityLayerTemplate {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.observability.title', {
    defaultMessage: 'Observability',
  }),
};
