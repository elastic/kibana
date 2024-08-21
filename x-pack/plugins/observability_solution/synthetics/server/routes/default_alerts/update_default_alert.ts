/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DefaultAlertService } from './default_alert_service';
import { SyntheticsRestApiRouteFactory } from '../types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import {
  SYNTHETICS_STATUS_RULE,
  SYNTHETICS_TLS_RULE,
} from '../../../common/constants/synthetics_alerts';
import { savedObjectsAdapter } from '../../saved_objects';

export const updateDefaultAlertingRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'PUT',
  path: SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING,
  validate: {},
  handler: async ({ request, context, server, savedObjectsClient }): Promise<any> => {
    const defaultAlertService = new DefaultAlertService(context, server, savedObjectsClient);
    const { defaultTLSRuleEnabled, defaultStatusRuleEnabled } =
      (await savedObjectsAdapter.getSyntheticsDynamicSettings(savedObjectsClient)) || {};

    const deleteStatusRulePromise =
      defaultStatusRuleEnabled === false
        ? server.pluginsStart.alerting.getRulesClientWithRequest(request).bulkDeleteRules({
            filter: `alert.attributes.alertTypeId:"${SYNTHETICS_STATUS_RULE}" AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
          })
        : new Promise<void>((resolve) => resolve());
    const deleteTLSRulePromise =
      defaultTLSRuleEnabled === false
        ? server.pluginsStart.alerting.getRulesClientWithRequest(request).bulkDeleteRules({
            filter: `alert.attributes.alertTypeId:"${SYNTHETICS_TLS_RULE}" AND alert.attributes.tags:"SYNTHETICS_DEFAULT_ALERT"`,
          })
        : new Promise<void>((resolve) => resolve());
    const createStatusRulePromise =
      defaultStatusRuleEnabled !== false
        ? defaultAlertService.updateStatusRule()
        : new Promise<void>((resolve) => resolve());
    const createTLSRulePromise =
      defaultTLSRuleEnabled !== false
        ? defaultAlertService.updateTlsRule()
        : new Promise<void>((resolve) => resolve());

    try {
      const [{ value: statusRule }, { value: tlsRule }] = await Promise.allSettled([
        createStatusRulePromise,
        createTLSRulePromise,
        deleteStatusRulePromise,
        deleteTLSRulePromise,
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
