/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const filterLabels = {
  LOCATION: i18n.translate('xpack.uptime.filterBar.options.location.name', {
    defaultMessage: 'Location',
  }),

  PORT: i18n.translate('xpack.uptime.filterBar.options.portLabel', { defaultMessage: 'Port' }),

  SCHEME: i18n.translate('xpack.uptime.filterBar.options.schemeLabel', {
    defaultMessage: 'Scheme',
  }),

  TAG: i18n.translate('xpack.uptime.filterBar.options.tagsLabel', {
    defaultMessage: 'Tag',
  }),
};
