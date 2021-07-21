/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EVENT_KIND } from '@kbn/rule-data-utils/target/technical_field_names';
import { RuleDataClient } from '../../../../rule_registry/server';
import {
  SERVICE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { rangeQuery } from '../../../../observability/server';
import { environmentQuery } from '../../../common/utils/environment_query';

export async function getServiceAlerts({
  ruleDataClient,
  start,
  end,
  serviceName,
  environment,
  transactionType,
}: {
  ruleDataClient: RuleDataClient;
  start: number;
  end: number;
  serviceName: string;
  environment?: string;
  transactionType: string;
}) {
  const response = await ruleDataClient.getReader().search({
    body: {
      query: {
        bool: {
          filter: [
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [EVENT_KIND]: 'signal' } },
          ],
          should: [
            {
              bool: {
                filter: [
                  {
                    term: {
                      [TRANSACTION_TYPE]: transactionType,
                    },
                  },
                ],
              },
            },
            {
              bool: {
                must_not: {
                  exists: {
                    field: TRANSACTION_TYPE,
                  },
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      size: 100,
      fields: ['*'],
      sort: {
        '@timestamp': 'desc',
      },
    },
    allow_no_indices: true,
  });

  return response.hits.hits.map((hit) => hit.fields);
}
