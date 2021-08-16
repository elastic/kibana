/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LAYER_WIZARD_CATEGORY } from '../../../../../common/constants';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
import { getSecurityIndexPatterns } from './alerting_index_pattern_utils';
import { AlertingLayerTemplate } from './alerting_layer_template';

export const AlertingLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH, LAYER_WIZARD_CATEGORY.SOLUTIONS],
  getIsDisabled: async () => {
    const indexPatterns = await getAlertingIndexPatterns();
    return indexPatterns.length === 0;
  },
  disabledReason: i18n.translate('xpack.maps.alerting.disabledDesc', {
    defaultMessage:
      'Cannot find alerting index pattern. To get started with Alerting, go to Alerting > Overview.',
  }),
  description: i18n.translate('xpack.maps.alerting.desc', {
    defaultMessage: 'Alerting layers',
  }),
  icon: 'logoAlerting', // TODO: Find good logo
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <AlertingLayerTemplate {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.alerting.title', {
    defaultMessage: 'Alerting',
  }),
};
