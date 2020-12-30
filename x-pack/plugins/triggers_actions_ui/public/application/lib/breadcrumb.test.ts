/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getAlertingSectionBreadcrumb, getAlertDetailsBreadcrumb } from './breadcrumb';
import { i18n } from '@kbn/i18n';
import { routeToConnectors, routeToAlerts, routeToHome } from '../constants';

describe('getAlertingSectionBreadcrumb', () => {
  test('if change calls return proper breadcrumb title ', async () => {
    expect(getAlertingSectionBreadcrumb('connectors')).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.connectors.breadcrumbTitle', {
        defaultMessage: 'Connectors',
      }),
      href: `${routeToConnectors}`,
    });
    expect(getAlertingSectionBreadcrumb('alerts')).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.alerts.breadcrumbTitle', {
        defaultMessage: 'Alerts',
      }),
      href: `${routeToAlerts}`,
    });
    expect(getAlertingSectionBreadcrumb('home')).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.home.breadcrumbTitle', {
        defaultMessage: 'Alerts and Actions',
      }),
      href: `${routeToHome}`,
    });
  });
});

describe('getAlertDetailsBreadcrumb', () => {
  test('if select an alert should return proper breadcrumb title with alert name ', async () => {
    expect(getAlertDetailsBreadcrumb('testId', 'testName')).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.alertDetails.breadcrumbTitle', {
        defaultMessage: 'testName',
      }),
      href: '/alert/testId',
    });
  });
});
