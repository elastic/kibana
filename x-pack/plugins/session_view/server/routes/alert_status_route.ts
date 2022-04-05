/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { AlertConsumers } from '@kbn/rule-data-utils';
import { schema } from '@kbn/config-schema';
import { IRouter } from '../../../../../src/core/server';
import {
  ALERT_STATUS_ROUTE,
  ALERT_UUID_PROPERTY,
  PREVIEW_ALERTS_INDEX,
} from '../../common/constants';
import { expandDottedObject } from '../../common/utils/expand_dotted_object';
import type { AlertsClient, RuleRegistryPluginStartContract } from '../../../rule_registry/server';

export const registerAlertStatusRoute = (
  router: IRouter,
  ruleRegistry: RuleRegistryPluginStartContract
) => {
  router.get(
    {
      path: ALERT_STATUS_ROUTE,
      validate: {
        query: schema.object({
          alertUuid: schema.string(),
        }),
      },
    },
    async (_context, request, response) => {
      const client = await ruleRegistry.getRacClientWithRequest(request);
      const { alertUuid } = request.query;
      const body = await searchAlertByUuid(client, alertUuid);

      return response.ok({ body });
    }
  );
};

export const searchAlertByUuid = async (client: AlertsClient, alertUuid: string) => {
  const indices = (await client.getAuthorizedAlertsIndices([AlertConsumers.SIEM]))?.filter(
    (index) => index !== PREVIEW_ALERTS_INDEX
  );

  if (!indices) {
    return { events: [] };
  }

  const result = await client.find({
    query: {
      match: {
        [ALERT_UUID_PROPERTY]: alertUuid,
      },
    },
    track_total_hits: false,
    size: 1,
    index: indices.join(','),
    featureIds: [AlertConsumers.SIEM],
  });

  const events = result.hits.hits.map((hit: any) => {
    // the alert indexes flattens many properties. this util unflattens them as session view expects structured json.
    hit._source = expandDottedObject(hit._source);

    return hit;
  });

  return { events };
};
