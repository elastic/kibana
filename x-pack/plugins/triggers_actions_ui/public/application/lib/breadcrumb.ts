/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { routeToHome, routeToConnectors, routeToRules, routeToRuleDetails } from '../constants';

export const getAlertingSectionBreadcrumb = (type: string): { text: string; href: string } => {
  // Home and sections
  switch (type) {
    case 'connectors':
      return {
        text: i18n.translate('xpack.triggersActionsUI.connectors.breadcrumbTitle', {
          defaultMessage: 'Connectors',
        }),
        href: `${routeToConnectors}`,
      };
    case 'rules':
      return {
        text: i18n.translate('xpack.triggersActionsUI.rules.breadcrumbTitle', {
          defaultMessage: 'Rules',
        }),
        href: `${routeToRules}`,
      };
    default:
      return {
        text: i18n.translate('xpack.triggersActionsUI.home.breadcrumbTitle', {
          defaultMessage: 'Rules and Connectors',
        }),
        href: `${routeToHome}`,
      };
  }
};

export const getRuleDetailsBreadcrumb = (
  id: string,
  name: string
): { text: string; href: string } => {
  return {
    text: name,
    href: `${routeToRuleDetails.replace(':ruleId', id)}`,
  };
};
