/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SYNTHETICS_APP_ENABLEMENT_TITLE = i18n.translate(
  'xpack.synthetics.emptyState.enablement.title',
  {
    defaultMessage: 'Monitor the status of your services and applications with Synthetics',
  }
);

export const MONITOR_MANAGEMENT_DISABLED_MESSAGE = i18n.translate(
  'xpack.synthetics.emptyState.enablement.disabledDescription',
  {
    defaultMessage:
      'Run automated checks based on real-browser simulations and lightweight endpoint pings to measure the experience of your users from any location worldwide.',
  }
);

export const MONITOR_MANAGEMENT_CONTACT_ADMINISTRATOR = i18n.translate(
  'xpack.synthetics.emptyState.enablement.contactAdministrator',
  {
    defaultMessage: 'Only administrators can enable this feature.',
  }
);

export const MONITOR_MANAGEMENT_ENABLEMENT_BTN_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.emptyState.enablement.title',
  {
    defaultMessage: 'Enable',
  }
);

export const DOCS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.emptyState.enablement.doc',
  {
    defaultMessage: 'Read the docs',
  }
);

export const LEARN_MORE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.emptyState.enablement.learnMore',
  {
    defaultMessage: 'Want to learn more?',
  }
);
