/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LAYER_WIZARD_CATEGORY } from '../../../../../common/constants';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
import { getSecurityIndexPatterns } from './security_index_pattern_utils';
import { SecurityLayerTemplate } from './security_layer_template';

export const SecurityLayerWizardConfig: LayerWizard = {
  categories: [LAYER_WIZARD_CATEGORY.ELASTICSEARCH, LAYER_WIZARD_CATEGORY.SOLUTIONS],
  checkVisibility: async () => {
    const indexPatterns = await getSecurityIndexPatterns();
    return indexPatterns.length > 0;
  },
  description: i18n.translate('xpack.maps.security.desc', {
    defaultMessage: 'Security layers',
  }),
  icon: 'logoSecurity',
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <SecurityLayerTemplate {...renderWizardArguments} />;
  },
  title: i18n.translate('xpack.maps.security.title', {
    defaultMessage: 'Security',
  }),
};
