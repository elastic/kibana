/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SYNTHETICS_ENABLE_SUCCESS = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsEnableSuccess',
  {
    defaultMessage: 'Monitor Management enabled successfully.',
  }
);

export const SYNTHETICS_DISABLE_SUCCESS = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsDisabledSuccess',
  {
    defaultMessage: 'Monitor Management disabled successfully.',
  }
);

export const MONITOR_MANAGEMENT_ENABLEMENT_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.emptyState.enablement.enabled.title',
  {
    defaultMessage: 'Enable Monitor Management',
  }
);

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
      'Enable Monitor Management to run lightweight and real-browser monitors from hosted testing locations around the world. Enabling Monitor Management will generate an API key to allow the Synthetics Service to write back to your Elasticsearch cluster.',
  }
);

export const MONITOR_MANAGEMENT_DISABLED_MESSAGE = i18n.translate(
  'xpack.synthetics.emptyState.enablement.disabledDescription',
  {
    defaultMessage:
      'Synthetics App is currently disabled. Synthetics App allows you to run lightweight and real-browser monitors from hosted testing locations around the world. To enable Synthetics App, please contact an administrator.',
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
