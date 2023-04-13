/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PublicContract } from '@kbn/utility-types';
import { IRuleDataClient } from '../rule_data_client';
import { ALERT_UUID } from '../../common/technical_rule_data_field_names';

type RuleDataClient = PublicContract<IRuleDataClient>;

export const fetchAlertByAlertUUID = async (ruleDataClient: RuleDataClient, alertUuid: string) => {
  const request = {
    body: {
      query: {
        bool: {
          filter: [
            {
              term: {
                [ALERT_UUID]: alertUuid,
              },
            },
          ],
        },
      },
      size: 1,
    },
    allow_no_indices: true,
  };
  const { hits } = await ruleDataClient.getReader().search(request);
  return hits?.hits?.[0]?._source;
};
