/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { times } from 'lodash';
import { PublicContract } from '@kbn/utility-types';
import { IRuleDataClient } from '../rule_data_client';
import {
  ALERT_RULE_UUID,
  ALERT_UUID,
  TIMESTAMP,
} from '../../common/technical_rule_data_field_names';

const PAGE_SIZE = 10000;

interface TrackedAlertState {
  alertId: string;
  alertUuid: string;
  started: string;
}
type RuleDataClient = PublicContract<IRuleDataClient>;

const fetchAlerts = async (
  ruleDataClient: RuleDataClient,
  states: TrackedAlertState[],
  commonRuleFields: any,
  from = 0,
  size = 10000
) => {
  const { hits } = await ruleDataClient.getReader().search({
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
      from,
      size,
      collapse: {
        field: ALERT_UUID,
      },
      sort: {
        [TIMESTAMP]: 'desc' as const,
      },
    },
    allow_no_indices: true,
  });
  return hits.hits;
};

export const fetchExistingAlerts = async (
  ruleDataClient: RuleDataClient,
  trackedAlertStates: TrackedAlertState[],
  commonRuleFields: any
) => {
  const totalPages = Math.ceil(trackedAlertStates.length / PAGE_SIZE);
  const results = await Promise.all(
    times(totalPages).map((n) => {
      const from = n !== 0 ? n * PAGE_SIZE + 1 : 0;
      return fetchAlerts(ruleDataClient, trackedAlertStates, commonRuleFields, from, PAGE_SIZE);
    })
  );
  return results.flat();
};
