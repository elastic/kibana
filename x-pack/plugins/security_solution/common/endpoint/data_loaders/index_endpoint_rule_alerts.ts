/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { DEFAULT_ALERTS_INDEX } from '../../constants';
import { EndpointRuleAlertGenerator } from '../data_generators/endpoint_rule_alert_generator';

interface IndexEndpointRuleAlertsOptions {
  esClient: Client;
  endpointAgentId: string;
  count?: number;
  log?: ToolingLog;
}

interface IndexedEndpointRuleAlerts {
  alerts: estypes.WriteResponseBase[];
  cleanup: () => Promise<void>;
}

/**
 * Loads alerts for Endpoint directly into the internal index that the Endpoint Rule would have
 * written them to for a given endpoint
 * @param esClient
 * @param count
 */
export const indexEndpointRuleAlerts = async ({
  esClient,
  endpointAgentId,
  count = 1,
  log = new ToolingLog(),
}: IndexEndpointRuleAlertsOptions): Promise<IndexedEndpointRuleAlerts> => {
  log.verbose(`Indexing ${count} endpoint rule alerts`);

  // FIXME:PT implement ensureEndpointRuleAlertsIndexExists
  // await ensureEndpointRuleAlertsIndexExists();

  const alertsGenerator = new EndpointRuleAlertGenerator();
  const indexedAlerts: estypes.IndexResponse[] = [];

  for (let n = 0; n < count; n++) {
    const alert = alertsGenerator.generate({ agent: { id: endpointAgentId } });
    const indexedAlert = await esClient.index({
      index: `${DEFAULT_ALERTS_INDEX}-default`,
      refresh: 'wait_for',
      body: alert,
    });

    indexedAlerts.push(indexedAlert);
  }

  log.verbose(`Endpoint rule alerts created:`, indexedAlerts);

  return {
    alerts: indexedAlerts,
    cleanup: async (): Promise<void> => {
      if (indexedAlerts.length) {
        log.verbose('cleaning up loaded endpoint rule alerts');

        await esClient.bulk({
          body: indexedAlerts.map((indexedDoc) => {
            return {
              delete: {
                _index: indexedDoc._index,
                _id: indexedDoc._id,
              },
            };
          }),
        });

        log.verbose(
          `Deleted ${indexedAlerts.length} endpoint rule alerts. Ids: [${indexedAlerts
            .map((alert) => alert._id)
            .join()}]`
        );
      }
    },
  };
};
