/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const LOADING_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.manageMonitorLoadingLabel',
  {
    defaultMessage: 'Loading Monitor Management',
  }
);

export const LEARN_MORE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.manageMonitorLoadingLabel.callout.learnMore',
  {
    defaultMessage: 'Learn more.',
  }
);

export const CALLOUT_MANAGEMENT_DISABLED = i18n.translate(
  'xpack.synthetics.monitorManagement.callout.disabled',
  {
    defaultMessage: 'Monitor Management is disabled',
  }
);

export const CALLOUT_MANAGEMENT_CONTACT_ADMIN = i18n.translate(
  'xpack.synthetics.monitorManagement.callout.disabled.adminContact',
  {
    defaultMessage: 'Please contact your administrator to enable Monitor Management.',
  }
);

export const CALLOUT_MANAGEMENT_DESCRIPTION = i18n.translate(
  'xpack.synthetics.monitorManagement.callout.description.disabled',
  {
    defaultMessage:
      'Monitor Management is currently disabled. To run your monitors on Elastic managed Synthetics service, enable Monitor Management. Your existing monitors are paused.',
  }
);

export const ERROR_HEADING_BODY = i18n.translate(
  'xpack.synthetics.monitorManagement.editMonitorError.description',
  {
    defaultMessage: 'Monitor Management settings could not be loaded. Please contact Support.',
  }
);

export const SYNTHETICS_ENABLE_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.syntheticsEnableLabel.management',
  {
    defaultMessage: 'Enable Monitor Management',
  }
);

export const ERROR_HEADING_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.editMonitorError',
  {
    defaultMessage: 'Error loading Monitor Management',
  }
);

export const BETA_TOOLTIP_MESSAGE = i18n.translate(
  'xpack.synthetics.monitors.management.betaLabel',
  {
    defaultMessage:
      'This functionality is in beta and is subject to change. The design and code is less mature than official generally available features and is being provided as-is with no warranties. Beta features are not subject to the support service level agreement of official generally available features.',
  }
);

export const SUMMARY_LABEL = i18n.translate('xpack.synthetics.monitorManagement.summary.heading', {
  defaultMessage: 'Summary',
});

export const CONFIGURATIONS_LABEL = i18n.translate(
  'xpack.synthetics.monitorManagement.configurations.label',
  {
    defaultMessage: 'Configurations',
  }
);

export const DISABLED_LABEL = i18n.translate('xpack.synthetics.monitorManagement.disabled.label', {
  defaultMessage: 'Disabled',
});

export const TEST_RUNS_LABEL = i18n.translate('xpack.synthetics.monitorManagement.testRuns.label', {
  defaultMessage: 'Test runs',
});

export function getLastXDaysLabel(count: number) {
  return i18n.translate('xpack.synthetics.monitorManagement.lastXDays', {
    defaultMessage: 'Last {count, number} {count, plural, one {day} other {days}}',
    values: {
      count,
    },
  });
}
