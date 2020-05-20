/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { getCurrentBreadcrumb } from './breadcrumb';
import { i18n } from '@kbn/i18n';
import { routeToConnectors, routeToAlerts, routeToHome } from '../constants';

describe('getCurrentBreadcrumb', () => {
  test('if change calls return proper breadcrumb title ', async () => {
    expect(getCurrentBreadcrumb('connectors')).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.connectors.breadcrumbTitle', {
        defaultMessage: 'Connectors',
      }),
      href: `${routeToConnectors}`,
    });
    expect(getCurrentBreadcrumb('alerts')).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.alerts.breadcrumbTitle', {
        defaultMessage: 'Alerts',
      }),
      href: `${routeToAlerts}`,
    });
    expect(getCurrentBreadcrumb('home')).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.home.breadcrumbTitle', {
        defaultMessage: 'Alerts and Actions',
      }),
      href: `${routeToHome}`,
    });
  });
});
