/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunk } from 'lodash';
import { PublicContract } from '@kbn/utility-types';
import { IRuleDataClient } from '../rule_data_client';
import {
  ALERT_RULE_UUID,
  ALERT_UUID,
  TIMESTAMP,
} from '../../common/technical_rule_data_field_names';

const CHUNK_SIZE = 10000;

interface TrackedAlertState {
  alertId: string;
  alertUuid: string;
  started: string;
}
type RuleDataClient = PublicContract<IRuleDataClient>;

const fetchAlertsForStates = async (
  ruleDataClient: RuleDataClient,
  states: TrackedAlertState[],
  commonRuleFields: any
) => {
  const request = {
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                [ALERT_RULE_UUID]: commonRuleFields[ALERT_RULE_UUID],
              },
            },
            {
              terms: {
                [ALERT_UUID]: states.map((state) => state.alertUuid),
              },
            },
          ],
        },
      },
      size: states.length,
      collapse: {
        field: ALERT_UUID,
      },
      sort: {
        [TIMESTAMP]: 'desc' as const,
      },
    },
    allow_no_indices: true,
  } as any;
  const { hits } = await ruleDataClient.getReader().search(request);
  return hits.hits;
};

export const fetchExistingAlerts = async (
  ruleDataClient: RuleDataClient,
  trackedAlertStates: TrackedAlertState[],
  commonRuleFields: any
) => {
  const results = await Promise.all(
    chunk(trackedAlertStates, CHUNK_SIZE).map((states) =>
      fetchAlertsForStates(ruleDataClient, states, commonRuleFields)
    )
  );
  return results.flat();
};
