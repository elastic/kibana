/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ToggleFlyoutTranslations = {
  toggleButtonAriaLabel: i18n.translate(
    'xpack.synthetics.alertsRulesPopover.toggleButton.ariaLabel',
    {
      defaultMessage: 'Open alerts and rules menu',
    }
  ),

  toggleMonitorStatusAriaLabel: i18n.translate('xpack.synthetics.toggleAlertFlyout.ariaLabel', {
    defaultMessage: 'Open add rule flyout',
  }),
  toggleMonitorStatusContent: i18n.translate('xpack.synthetics.toggleAlertButton.content', {
    defaultMessage: 'Monitor status rule',
  }),
  navigateToAlertingUIAriaLabel: i18n.translate('xpack.synthetics.app.navigateToAlertingUi', {
    defaultMessage: 'Leave Synthetics and go to Alerting Management page',
  }),
  navigateToAlertingButtonContent: i18n.translate(
    'xpack.synthetics.app.navigateToAlertingButton.content',
    {
      defaultMessage: 'Manage rules',
    }
  ),
  alertsAndRules: i18n.translate('xpack.synthetics.alerts.toggleAlertFlyoutButtonText', {
    defaultMessage: 'Alerts and rules',
  }),
};
