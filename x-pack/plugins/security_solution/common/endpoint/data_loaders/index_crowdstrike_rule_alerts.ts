/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client, estypes } from '@elastic/elasticsearch';

import { DEFAULT_ALERTS_INDEX } from '../../constants';
import { CrowdstrikeRuleAlertGenerator } from '../data_generators/crowdstrike_rule_alert_generator';

export interface IndexEndpointRuleAlertsOptions {
  esClient: Client;
  count?: number;
}

export interface IndexedCrowdstrikeRuleAlerts {
  alerts: estypes.WriteResponseBase[];
  cleanup: () => Promise<DeletedIndexedCrowdstrikeRuleAlerts>;
}

export interface DeletedIndexedCrowdstrikeRuleAlerts {
  data: estypes.BulkResponse;
}

/**
 * Loads alerts for Endpoint directly into the internal index that the Endpoint Rule would have
 * written them to for a given endpoint
 * @param esClient
 * @param count
 */
export const indexCrowdstrikeRuleAlerts = async ({
  esClient,
  count = 1,
}: IndexEndpointRuleAlertsOptions): Promise<IndexedCrowdstrikeRuleAlerts> => {
  const alertsGenerator = new CrowdstrikeRuleAlertGenerator();
  const indexedAlerts: estypes.IndexResponse[] = [];

  for (let n = 0; n < count; n++) {
    const alert = alertsGenerator.generate({});
    const indexedAlert = await esClient.index({
      index: `${DEFAULT_ALERTS_INDEX}-default`,
      refresh: 'wait_for',
      body: alert,
    });

    indexedAlerts.push(indexedAlert);
  }

  return {
    alerts: indexedAlerts,
    cleanup: deleteIndexedCrowdstrikeRuleAlerts.bind(null, esClient, indexedAlerts),
  };
};

export const deleteIndexedCrowdstrikeRuleAlerts = async (
  esClient: Client,
  indexedAlerts: IndexedCrowdstrikeRuleAlerts['alerts']
): Promise<DeletedIndexedCrowdstrikeRuleAlerts> => {
  let response: estypes.BulkResponse = {
    took: 0,
    errors: false,
    items: [],
  };

  if (indexedAlerts.length) {
    response = await esClient.bulk({
      body: indexedAlerts.map((indexedDoc) => {
        return {
          delete: {
            _index: indexedDoc._index,
            _id: indexedDoc._id,
          },
        };
      }),
    });
  }

  return { data: response };
};
