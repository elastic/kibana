/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CustomIntegrationsPluginSetup } from '../../../../src/plugins/custom_integrations/server';
import { applicationPath, featureId, featureTitle } from '../common';

export function registerWithCustomIntegrations(customIntegrations: CustomIntegrationsPluginSetup) {
  customIntegrations.registerCustomIntegration({
    id: featureId,
    title: featureTitle,
    description: i18n.translate('xpack.dataVisualizer.customIntegrationsDescription', {
      defaultMessage:
        'Upload data from a CSV, TSV, JSON or other log file to Elasticsearch for analysis.',
    }),
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
