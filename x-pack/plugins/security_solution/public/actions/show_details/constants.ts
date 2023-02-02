/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const SHOW_DETAILS_ICON = 'expand';

export const SHOW_DETAILS_TITLE = (name: string) =>
  i18n.translate('xpack.securitySolution.actions.cellValue.showDetails.displayName', {
    values: { name },
    defaultMessage: 'View {name} details',
  });

export const IP_LABEL = i18n.translate('xpack.securitySolution.actions.cellValue.showDetails.ip', {
  defaultMessage: 'ip',
});
export const USER_LABEL = i18n.translate(
  'xpack.securitySolution.actions.cellValue.showDetails.user',
  {
    defaultMessage: 'user',
  }
);
export const HOST_LABEL = i18n.translate(
  'xpack.securitySolution.actions.cellValue.showDetails.host',
  {
    defaultMessage: 'host',
  }
);
