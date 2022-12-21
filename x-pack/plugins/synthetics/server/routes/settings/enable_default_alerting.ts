/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { SavedObjectsClientContract } from '@kbn/core-saved-objects-api-server';
import { FindActionResult } from '@kbn/actions-plugin/server';
import { UptimeServerSetup } from '../../legacy_uptime/lib/adapters';
import { savedObjectsAdapter } from '../../legacy_uptime/lib/saved_objects';
import { populateAlertActions, RuleAction } from '../../../common/rules/alert_actions';
import {
  ACTION_GROUP_DEFINITIONS,
  SYNTHETICS_ALERT_RULE_TYPES,
} from '../../../common/constants/synthetics_alerts';
import { SyntheticsRestApiRouteFactory } from '../../legacy_uptime/routes/types';
import { SYNTHETICS_API_URLS } from '../../../common/constants';
import { UptimeRequestHandlerContext } from '../../types';

export const enableDefaultAlertingRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'POST',
  path: SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING,
  validate: {
    body: schema.object({
      isDisabled: schema.maybe(schema.boolean()),
      isUpdated: schema.maybe(schema.boolean()),
    }),
  },
  writeAccess: true,
  handler: async ({ context, server, savedObjectsClient, request }): Promise<any> => {
    const { isUpdated } = (request.body ?? {}) as { isDisabled?: string; isUpdated?: boolean };

    return createDefaultAlertIfNotExist({
      context,
      isUpdated,
      soClient: savedObjectsClient,
      server,
    });
  },
});

export const getDefaultAlertingRoute: SyntheticsRestApiRouteFactory = () => ({
  method: 'GET',
  path: SYNTHETICS_API_URLS.ENABLE_DEFAULT_ALERTING,
  validate: {},
  handler: async ({ context }): Promise<any> => {
    const rulesClient = (await context.alerting)?.getRulesClient();

    const { data } = await rulesClient.find({
      options: {
        page: 1,
        perPage: 1000,
        filter: `alert.attributes.alertTypeId:(${SYNTHETICS_ALERT_RULE_TYPES.MONITOR_STATUS})`,
      },
    });

    const alert = data?.[0];
    if (!alert) {
      return;
    }

    return { ...alert, ruleTypeId: alert.alertTypeId };
  },
});

export const createDefaultAlertIfNotExist = async ({
  server,
  soClient,
  context,
  isUpdated,
}: {
  isUpdated?: boolean;
  server: UptimeServerSetup;
  soClient: SavedObjectsClientContract;
  context: UptimeRequestHandlerContext;
}) => {
  const rulesClient = (await context.alerting)?.getRulesClient();

  const { data } = await rulesClient.find({
    options: {
      page: 1,
      perPage: 1000,
      filter: `alert.attributes.alertTypeId:(${SYNTHETICS_ALERT_RULE_TYPES.MONITOR_STATUS})`,
    },
  });

  if (data.length > 0 && !isUpdated) {
    const alert = data[0];
    return { ...alert, ruleTypeId: alert.alertTypeId };
  }

  const { actionConnectors, settings } = await getActionConnectors(context, soClient, server);

  const defaultActions = (actionConnectors ?? []).filter((act) =>
    settings?.defaultConnectors?.includes(act.id)
  );

  const actions: RuleAction[] = populateAlertActions({
    groupId: ACTION_GROUP_DEFINITIONS.MONITOR_STATUS.id,
    defaultActions,
    defaultEmail: settings?.defaultEmail!,
  });

  if (data.length === 0) {
    const alert = await rulesClient.create<{}>({
      data: {
        actions,
        params: {},
        consumer: 'uptime',
        alertTypeId: SYNTHETICS_ALERT_RULE_TYPES.MONITOR_STATUS,
        schedule: { interval: '1m' },
        notifyWhen: 'onActionGroupChange',
        tags: ['SYNTHETICS_DEFAULT_ALERT'],
        name: `Synthetics internal alert`,
        enabled: true,
        throttle: null,
      },
    });
    return { ...alert, ruleTypeId: alert.alertTypeId };
  } else {
    const alert = data[0];
    const updatedAlert = await rulesClient.update({
      id: alert.id,
      data: {
        actions,
        name: alert.name,
        tags: alert.tags,
        schedule: alert.schedule,
        params: alert.params,
        notifyWhen: alert.notifyWhen,
      },
    });
    return { ...updatedAlert, ruleTypeId: updatedAlert.alertTypeId };
  }
};

const getActionConnectors = async (
  context: UptimeRequestHandlerContext,
  soClient: SavedObjectsClientContract,
  server: UptimeServerSetup
) => {
  const actionsClient = (await context.actions)?.getActionsClient();

  const settings = await savedObjectsAdapter.getUptimeDynamicSettings(soClient);
  let actionConnectors: FindActionResult[] = [];
  try {
    actionConnectors = await actionsClient.getAll();
  } catch (e) {
    server.logger.error(e);
  }
  return { actionConnectors, settings };
};
