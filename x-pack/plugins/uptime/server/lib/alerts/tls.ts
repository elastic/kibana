/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { UptimeAlertTypeFactory } from './types';
import { savedObjectsAdapter } from '../saved_objects';
import { updateState } from './common';
import { ACTION_GROUP_DEFINITIONS } from '../../../../../legacy/plugins/uptime/common/constants';

const { TLS } = ACTION_GROUP_DEFINITIONS;

export const tlsAlertFactory: UptimeAlertTypeFactory = (server, libs) => ({
  id: 'xpack.uptime.alerts.tls',
  name: i18n.translate('xpack/uptime.alerts.tls', {
    defaultMessage: 'Uptime TLS',
  }),
  validate: {
    params: schema.object({
      from: schema.string(),
      to: schema.string(),
      index: schema.number(),
      size: schema.number(),
      search: schema.maybe(schema.string()),
      filters: schema.maybe(schema.string()),
    }),
  },
  defaultActionGroupId: TLS.id,
  actionGroups: [
    {
      id: TLS.id,
      name: TLS.name,
    },
  ],
  actionVariables: {
    context: [],
    state: [],
  },
  async executor(options) {
    const {
      params: { from, to, index, size, search },
      services: { alertInstanceFactory, callCluster, savedObjectsClient },
      state,
    } = options;
    const dynamicSettings = await savedObjectsAdapter.getUptimeDynamicSettings(savedObjectsClient);
    const certs = await libs.requests.getCerts({
      callES: callCluster,
      dynamicSettings,
      from,
      to,
      index,
      size,
      search,
    });

    if (certs.length) {
      const alertInstance = alertInstanceFactory(TLS.id);
      // this is not scalable
      alertInstance.replaceState({ certs });
      alertInstance.scheduleActions(TLS.id);
    }

    return updateState(state, certs.length > 0);
  },
});
