/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertingSectionBreadcrumb, getRuleDetailsBreadcrumb } from './breadcrumb';
import { i18n } from '@kbn/i18n';
import { routeToConnectors, routeToRules, routeToHome } from '../constants';

describe('getAlertingSectionBreadcrumb', () => {
  test('if change calls return proper breadcrumb title ', async () => {
    expect(getAlertingSectionBreadcrumb('connectors')).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.connectors.breadcrumbTitle', {
        defaultMessage: 'Connectors',
      }),
      href: `${routeToConnectors}`,
    });
    expect(getAlertingSectionBreadcrumb('rules')).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.rules.breadcrumbTitle', {
        defaultMessage: 'Rules',
      }),
      href: `${routeToRules}`,
    });
    expect(getAlertingSectionBreadcrumb('home')).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.home.breadcrumbTitle', {
        defaultMessage: 'Rules and Connectors',
      }),
      href: `${routeToHome}`,
    });
  });
});

describe('getRuleDetailsBreadcrumb', () => {
  test('if select an alert should return proper breadcrumb title with alert name ', async () => {
    expect(getRuleDetailsBreadcrumb('testId', 'testName')).toMatchObject({
      text: i18n.translate('xpack.triggersActionsUI.alertDetails.breadcrumbTitle', {
        defaultMessage: 'testName',
      }),
      href: '/rule/testId',
    });
  });
});
