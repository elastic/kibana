/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { LayerWizard, RenderWizardArguments } from '../../layer_wizard_registry';
import { getSecurityIndexPatterns } from './security_index_pattern_utils';

export const SecurityLayerWizardConfig: LayerWizard = {
  checkVisibility: async () => {
    const indexPatterns = await getSecurityIndexPatterns();
    return indexPatterns.length > 0;
  },
  description: i18n.translate('xpack.maps.security.desc', {
    defaultMessage: 'SIEM layers',
  }),
  icon: 'logoSecurity',
  renderWizard: (renderWizardArguments: RenderWizardArguments) => {
    return <div>hello world</div>;
  },
  title: i18n.translate('xpack.maps.security.title', {
    defaultMessage: 'Security',
  }),
};
