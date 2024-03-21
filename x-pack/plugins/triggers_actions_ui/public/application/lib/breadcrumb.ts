/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import {
  routeToHome,
  routeToConnectors,
  routeToRules,
  routeToLogs,
  legacyRouteToAlerts,
} from '../constants';

export const getAlertingSectionBreadcrumb = (
  type: string,
  returnHref: boolean = false
): { text: string; href?: string } => {
  // Home and sections
  switch (type) {
    case 'logs':
      return {
        text: i18n.translate('xpack.triggersActionsUI.logs.breadcrumbTitle', {
          defaultMessage: 'Logs',
        }),
        ...(returnHref
          ? {
              href: `${routeToLogs}`,
            }
          : {}),
      };
    case 'connectors':
      return {
        text: i18n.translate('xpack.triggersActionsUI.connectors.breadcrumbTitle', {
          defaultMessage: 'Connectors',
        }),
        ...(returnHref
          ? {
              href: `${routeToConnectors}`,
            }
          : {}),
      };
    case 'rules':
      return {
        text: i18n.translate('xpack.triggersActionsUI.rules.breadcrumbTitle', {
          defaultMessage: 'Rules',
        }),
        ...(returnHref
          ? {
              href: `${routeToRules}`,
            }
          : {}),
      };
    case 'alerts':
      return {
        text: i18n.translate('xpack.triggersActionsUI.alerts.breadcrumbTitle', {
          defaultMessage: 'Alerts',
        }),
        ...(returnHref
          ? {
              href: `${legacyRouteToAlerts}`,
            }
          : {}),
      };
    default:
      return {
        text: i18n.translate('xpack.triggersActionsUI.home.breadcrumbTitle', {
          defaultMessage: 'Rules',
        }),
        ...(returnHref
          ? {
              href: `${routeToHome}`,
            }
          : {}),
      };
  }
};
