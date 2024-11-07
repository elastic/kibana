/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultAlertService } from './default_alert_service';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { savedObjectsAdapter } from '../../saved_objects';
import { DEFAULT_ALERT_RESPONSE } from '../../../common/types/default_alerts';

export const updateDefaultAlertingRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING,
  validate: {},
  handler: async ({
    request,
    context,
    server,
    savedObjectsClient,
  }): Promise<DEFAULT_ALERT_RESPONSE> => {
    const defaultAlertService = new DefaultAlertService(context, server, savedObjectsClient);
    const { defaultTLSRuleEnabled, defaultStatusRuleEnabled } =
      await savedObjectsAdapter.getSyntheticsDynamicSettings(savedObjectsClient);

    const updateStatusRulePromise = defaultAlertService.updateStatusRule(defaultStatusRuleEnabled);
    const updateTLSRulePromise = defaultAlertService.updateTlsRule(defaultTLSRuleEnabled);

    try {
      const [statusRule, tlsRule] = await Promise.all([
        updateStatusRulePromise,
        updateTLSRulePromise,
      ]);
      return {
        statusRule: statusRule || null,
        tlsRule: tlsRule || null,
      };
    } catch (e) {
      server.logger.error(`Error updating default alerting rules: ${e}`);
      return {
        statusRule: null,
        tlsRule: null,
      };
    }
  },
});
