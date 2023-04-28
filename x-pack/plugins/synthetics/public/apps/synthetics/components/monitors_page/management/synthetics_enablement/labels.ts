/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SYNTHETICS_APP_DISABLED_LABEL = i18n.translate(
  'xpack.synthetics.emptyState.enablement.disabled.title',
  {
    defaultMessage: 'Synthetics App is disabled',
  }
);

export const MONITOR_MANAGEMENT_ENABLEMENT_MESSAGE = i18n.translate(
  'xpack.synthetics.monitorManagement.emptyState.enablement',
  {
    defaultMessage:
      'Enable Synthetics App to run lightweight and real-browser monitors from hosted testing locations around the world. Enabling Synthetics App will generate an API key to allow the Synthetics Service to write back to your Elasticsearch cluster.',
  }
);

export const MONITOR_MANAGEMENT_DISABLED_MESSAGE = i18n.translate(
  'xpack.synthetics.emptyState.enablement.disabledDescription',
  {
    defaultMessage:
      'Synthetics App is currently disabled. Synthetics App allows you to run lightweight and real-browser monitors from hosted testing locations around the world. Synthetics App will be enabled when an admin visits the Synthetics app.',
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
