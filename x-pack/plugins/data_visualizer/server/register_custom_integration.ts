/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CustomIntegrationsPluginSetup } from '../../../../src/plugins/custom_integrations/server';
import { applicationPath, featureDescription, featureId, featureTitle } from '../common';

export function registerWithCustomIntegrations(customIntegrations: CustomIntegrationsPluginSetup) {
  customIntegrations.registerCustomIntegration({
    id: featureId,
    title: featureTitle,
    description: featureDescription,
    uiInternalPath: applicationPath,
    isBeta: false,
    icons: [
      {
        type: 'eui',
        src: 'addDataApp',
      },
    ],
    categories: ['upload_file'],
    shipper: 'other',
  });
}
