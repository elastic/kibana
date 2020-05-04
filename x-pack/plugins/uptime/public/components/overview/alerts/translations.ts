/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const TlsTranslations = {
  criteriaAriaLabel: i18n.translate('xpack.uptime.alerts.tls.criteriaExpression.ariaLabel', {
    defaultMessage:
      'An expression displaying the criteria for monitor that are watched by this alert',
  }),
  criteriaDescription: i18n.translate('xpack.uptime.alerts.tls.criteriaExpression.description', {
    defaultMessage: 'when',
    description:
      'The context of this `when` is in the conditional sense, like "when there are three cookies, eat them all".',
  }),
  criteriaValue: i18n.translate('xpack.uptime.alerts.tls.criteriaExpression.value', {
    defaultMessage: 'any monitor',
  }),
  expirationAriaLabel: i18n.translate('xpack.uptime.alerts.tls.expirationExpression.ariaLabel', {
    defaultMessage:
      'An expression displaying the threshold that will trigger the TLS alert for certificate expiration',
  }),
  expirationDescription: i18n.translate(
    'xpack.uptime.alerts.tls.expirationExpression.description',
    {
      defaultMessage: 'has a certificate expiring within',
    }
  ),
  expirationValue: (value?: number) =>
    i18n.translate('xpack.uptime.alerts.tls.expirationExpression.value', {
      defaultMessage: '{value} days',
      values: { value },
    }),
  ageAriaLabel: i18n.translate('xpack.uptime.alerts.tls.ageExpression.ariaLabel', {
    defaultMessage:
      'An expressing displaying the threshold that will trigger the TLS alert for old certificates',
  }),
  ageDescription: i18n.translate('xpack.uptime.alerts.tls.ageExpression.description', {
    defaultMessage: 'or older than',
  }),
  ageValue: (value?: number) =>
    i18n.translate('xpack.uptime.alerts.tls.ageExpression.value', {
      defaultMessage: '{value} days',
      values: { value },
    }),
};

export const ToggleFlyoutTranslations = {
  toggleButtonAriaLabel: i18n.translate('xpack.uptime.alertsPopover.toggleButton.ariaLabel', {
    defaultMessage: 'Open alert context menu',
  }),
  openAlertContextPanelAriaLabel: i18n.translate('xpack.uptime.openAlertContextPanel.ariaLabel', {
    defaultMessage: 'Open the alert context panel so you can choose an alert type',
  }),
  openAlertContextPanelLabel: i18n.translate('xpack.uptime.openAlertContextPanel.label', {
    defaultMessage: 'Create alert',
  }),
  toggleTlsAriaLabel: i18n.translate('xpack.uptime.toggleTlsAlertButton.ariaLabel', {
    defaultMessage: 'Open TLS alert flyout',
  }),
  toggleTlsContent: i18n.translate('xpack.uptime.toggleTlsAlertButton.content', {
    defaultMessage: 'TLS alert',
  }),
  toggleMonitorStatusAriaLabel: i18n.translate('xpack.uptime.toggleAlertFlyout.ariaLabel', {
    defaultMessage: 'Open add alert flyout',
  }),
  toggleMonitorStatusContent: i18n.translate('xpack.uptime.toggleAlertButton.content', {
    defaultMessage: 'Monitor status alert',
  }),
  navigateToAlertingUIAriaLabel: i18n.translate('xpack.uptime.navigateToAlertingUi', {
    defaultMessage: 'Leave Uptime and go to Alerting Management page',
  }),
  navigateToAlertingButtonContent: i18n.translate('xpack.uptime.navigateToAlertingButton.content', {
    defaultMessage: 'Manage alerts',
  }),
};
