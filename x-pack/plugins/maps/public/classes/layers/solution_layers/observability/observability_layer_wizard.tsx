/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LAYER_WIZARD_CATEGORY } from '../../../../../common/constants';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
import { ObservabilityLayerTemplate } from './observability_layer_template';
import { APM_INDEX_PATTERN_ID } from './create_layer_descriptor';
import { getIndexPatternService } from '../../../../kibana_services';

export const ObservabilityLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH, LAYER_WIZARD_CATEGORY.SOLUTIONS],
  checkVisibility: async () => {
    try {
      await getIndexPatternService().get(APM_INDEX_PATTERN_ID);
      return true;
    } catch (e) {
      return false;
    }
  },
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
