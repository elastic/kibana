/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { kea, MakeLogicType } from 'kea';

import { JSON_HEADER as headers } from '../../../../common/constants';
import { HttpLogic } from '../http';

interface SendTelemetry {
  action: 'viewed' | 'error' | 'clicked';
  metric: string; // e.g., 'setup_guide'
  product: 'enterprise_search' | 'app_search' | 'workplace_search';
}
export type SendTelemetryHelper = Omit<SendTelemetry, 'product'>;

interface TelemetryActions {
  sendTelemetry(args: SendTelemetry): SendTelemetry;
  sendEnterpriseSearchTelemetry(args: SendTelemetryHelper): SendTelemetryHelper;
  sendAppSearchTelemetry(args: SendTelemetryHelper): SendTelemetryHelper;
  sendWorkplaceSearchTelemetry(args: SendTelemetryHelper): SendTelemetryHelper;
}

export const TelemetryLogic = kea<MakeLogicType<TelemetryActions>>({
  path: ['enterprise_search', 'telemetry_logic'],
  actions: {
    sendTelemetry: ({ action, metric, product }) => ({ action, metric, product }),
    sendEnterpriseSearchTelemetry: ({ action, metric }) => ({ action, metric }),
    sendAppSearchTelemetry: ({ action, metric }) => ({ action, metric }),
    sendWorkplaceSearchTelemetry: ({ action, metric }) => ({ action, metric }),
  },
  listeners: ({ actions }) => ({
    sendTelemetry: async ({ action, metric, product }: SendTelemetry) => {
      const { http } = HttpLogic.values;
      try {
        const body = JSON.stringify({ product, action, metric });
        await http.put('/api/enterprise_search/stats', { headers, body });
      } catch (error) {
        throw new Error('Unable to send telemetry');
      }
    },
    sendEnterpriseSearchTelemetry: ({ action, metric }: SendTelemetryHelper) =>
      actions.sendTelemetry({ action, metric, product: 'enterprise_search' }),
    sendAppSearchTelemetry: ({ action, metric }: SendTelemetryHelper) =>
      actions.sendTelemetry({ action, metric, product: 'app_search' }),
    sendWorkplaceSearchTelemetry: ({ action, metric }: SendTelemetryHelper) =>
      actions.sendTelemetry({ action, metric, product: 'workplace_search' }),
  }),
});
