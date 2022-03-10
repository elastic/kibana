/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicContract } from '@kbn/utility-types';
import { IRuleDataClient } from '../rule_data_client';
import {
  ALERT_RULE_UUID,
  ALERT_INSTANCE_ID,
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  ALERT_START,
} from '../../common/technical_rule_data_field_names';
type RuleDataClient = PublicContract<IRuleDataClient>;

export const createFetchStartTime =
  (ruleDataClient: RuleDataClient, commonRuleFields: any) => async (instanceId: string) => {
    const request = {
      body: {
        size: 1,
        query: {
          bool: {
            filter: [
              {
                term: {
                  [ALERT_RULE_UUID]: commonRuleFields[ALERT_RULE_UUID],
                },
              },
              {
                term: {
                  [ALERT_INSTANCE_ID]: instanceId,
                },
              },
              {
                term: {
                  [ALERT_STATUS]: ALERT_STATUS_ACTIVE,
                },
              },
            ],
          },
        },
      },
    };

    const { hits } = await ruleDataClient.getReader().search(request);
    if (hits.hits.length === 1) {
      return hits.hits[0]._source[ALERT_START] || null;
    }
    return null;
  };
