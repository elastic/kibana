/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UptimeAlertTypeFactory } from './types';

export const tlsAlertFactory: UptimeAlertTypeFactory = (server, libs) => ({
  id: 'xpack.uptime.alerts.tls',
  name: i18n.translate('xpack/uptime.alerts.tls', {
    defaultMessage: 'Uptime TLS',
  }),
  validate: {
    params: schema.object({
      sha256: schema.string(),
    }),
  },
  defaultActionGroupId: 'TODO-ADD-HERE',
  actionGroups: [],
  actionVariables: {
    context: [],
    state: [],
  },
  async executor(options) {},
});
