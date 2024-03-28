/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const getCurrentDocTitle = (page: string): string => {
  let updatedTitle: string;

  switch (page) {
    case 'logs':
      updatedTitle = i18n.translate('xpack.triggersActionsUI.logs.breadcrumbTitle', {
        defaultMessage: 'Logs',
      });
      break;
    case 'connectors':
      updatedTitle = i18n.translate('xpack.triggersActionsUI.connectors.breadcrumbTitle', {
        defaultMessage: 'Connectors',
      });
      break;
    case 'rules':
      updatedTitle = i18n.translate('xpack.triggersActionsUI.rules.breadcrumbTitle', {
        defaultMessage: 'Rules',
      });
      break;
    case 'alerts':
      updatedTitle = i18n.translate('xpack.triggersActionsUI.alerts.breadcrumbTitle', {
        defaultMessage: 'Alerts',
      });
      break;
    default:
      updatedTitle = i18n.translate('xpack.triggersActionsUI.home.breadcrumbTitle', {
        defaultMessage: 'Rules',
      });
  }
  return updatedTitle;
};
