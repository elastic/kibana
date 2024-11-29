/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { CustomIntegration } from '@kbn/custom-integrations-plugin/common';

const APM_INTEGRATION_CATEGORIES = ['observability', 'apm'];

export const apmTutorialCustomIntegration: Omit<CustomIntegration, 'type'> = {
  id: 'apm',
  title: i18n.translate('xpack.apm.tutorial.specProvider.name', {
    defaultMessage: 'APM',
  }),
  categories: APM_INTEGRATION_CATEGORIES,
  uiInternalPath: '/app/apm/onboarding',
  description: i18n.translate('xpack.apm.tutorial.introduction', {
    defaultMessage: 'Collect performance metrics from your applications with Elastic APM.',
  }),
  icons: [
    {
      type: 'eui',
      src: 'apmApp',
    },
  ],
  shipper: 'tutorial',
  isBeta: false,
};
