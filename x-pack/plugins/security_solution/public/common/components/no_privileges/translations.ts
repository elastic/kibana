/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const NO_PERMISSIONS_TITLE = i18n.translate('xpack.securitySolution.noPermissionsTitle', {
  defaultMessage: 'Privileges required',
});

export const NO_PERMISSIONS_MSG = (pageName: string) =>
  i18n.translate('xpack.securitySolution.noPermissionsMessage', {
    values: { pageName },
    defaultMessage:
      'To view {pageName}, you must update privileges. For more information, contact your Kibana administrator.',
  });

export const GO_TO_DOCUMENTATION = i18n.translate(
  'xpack.securitySolution.goToDocumentationButton',
  {
    defaultMessage: 'View documentation',
  }
);
