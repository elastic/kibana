/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';

export const PLUGIN = {
  APP_ROOT_ID: 'react-uptime-root',
  DESCRIPTION: i18n.translate('xpack.uptime.pluginDescription', {
    defaultMessage: 'Uptime monitoring',
    description: 'The description text that will be shown to users in Kibana',
  }),
  ID: 'uptime',
  ROUTER_BASE_NAME: '/app/uptime#',
  LOCAL_STORAGE_KEY: 'xpack.uptime',
  TITLE: i18n.translate('xpack.uptime.uptimeFeatureCatalogueTitle', {
    defaultMessage: 'Uptime',
  }),
};
