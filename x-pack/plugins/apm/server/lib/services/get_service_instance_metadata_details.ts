/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  TRANSACTION_TYPE,
} from '../../../common/elasticsearch_fieldnames';
import { environmentQuery, kqlQuery, rangeQuery } from '../../utils/queries';
import { getProcessorEventForAggregatedTransactions } from '../helpers/aggregated_transactions';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

export interface KeyValue {
  key: string;
  value: any | undefined;
}

export async function getServiceInstanceMetadataDetails({
  serviceName,
  serviceNodeName,
  setup,
  searchAggregatedTransactions,
  transactionType,
  environment,
  kuery,
}: {
  serviceName: string;
  serviceNodeName: string;
  setup: Setup & SetupTimeRange;
  searchAggregatedTransactions: boolean;
  transactionType: string;
  environment?: string;
  kuery?: string;
}) {
  const { start, end, apmEventClient } = setup;
  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [SERVICE_NODE_NAME]: serviceNodeName } },
    { term: { [TRANSACTION_TYPE]: transactionType } },
    ...rangeQuery(start, end),
    ...environmentQuery(environment),
    ...kqlQuery(kuery),
  ];

  const response = await apmEventClient.search(
    'get_service_instance_metadata_details',
    {
      apm: {
        events: [
          getProcessorEventForAggregatedTransactions(
            searchAggregatedTransactions
          ),
        ],
      },
      body: {
        terminate_after: 1,
        size: 1,
        query: { bool: { filter } },
      },
    }
  );

  const sample = response.hits.hits[0]?._source;

  if (!sample) {
    return {};
  }

  const { agent, service, container, kubernetes, host, cloud } = sample;

  return {
    '@timestamp': sample['@timestamp'],
    agent,
    service,
    container,
    kubernetes,
    host,
    cloud,
  };
}
