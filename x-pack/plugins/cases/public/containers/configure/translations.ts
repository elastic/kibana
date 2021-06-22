/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export * from '../translations';

export const SUCCESS_CONFIGURE = i18n.translate('xpack.cases.configure.successSaveToast', {
  defaultMessage: 'Saved external connection settings',
});

export const READ_PERMISSIONS_ERROR_MSG = i18n.translate(
  'xpack.cases.configure.readPermissionsErrorDescription',
  {
    defaultMessage:
      'You do not have permissions to view connectors. If you would like to view the connectors associated with this case, contact your Kibana administrator.',
  }
);
