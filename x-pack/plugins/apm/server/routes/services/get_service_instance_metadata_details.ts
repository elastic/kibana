/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { merge } from 'lodash';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '../../../common/processor_event';
import {
  METRICSET_NAME,
  SERVICE_NAME,
  SERVICE_NODE_NAME,
} from '../../../common/elasticsearch_fieldnames';
import { Setup } from '../../lib/helpers/setup_request';
import { maybe } from '../../../common/utils/maybe';
import {
  getDocumentTypeFilterForTransactions,
  getProcessorEventForTransactions,
} from '../../lib/helpers/transactions';

export async function getServiceInstanceMetadataDetails({
  serviceName,
  serviceNodeName,
  setup,
  start,
  end,
}: {
  serviceName: string;
  serviceNodeName: string;
  setup: Setup;
  start: number;
  end: number;
}) {
  const { apmEventClient } = setup;
  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [SERVICE_NODE_NAME]: serviceNodeName } },
    ...rangeQuery(start, end),
  ];

  async function getApplicationMetricSample() {
    const response = await apmEventClient.search(
      'get_service_instance_metadata_details_application_metric',
      {
        apm: {
          events: [ProcessorEvent.metric],
        },
        body: {
          terminate_after: 1,
          size: 1,
          query: {
            bool: {
              filter: filter.concat({ term: { [METRICSET_NAME]: 'app' } }),
            },
          },
        },
      }
    );

    return maybe(response.hits.hits[0]?._source);
  }

  async function getTransactionEventSample() {
    const response = await apmEventClient.search(
      'get_service_instance_metadata_details_application_transaction_event',
      {
        apm: {
          events: [ProcessorEvent.transaction],
        },
        body: {
          terminate_after: 1,
          size: 1,
          query: { bool: { filter } },
        },
      }
    );

    return maybe(response.hits.hits[0]?._source);
  }

  async function getTransactionMetricSample() {
    const response = await apmEventClient.search(
      'get_service_instance_metadata_details_application_transaction_metric',
      {
        apm: {
          events: [getProcessorEventForTransactions(true)],
        },
        body: {
          terminate_after: 1,
          size: 1,
          query: {
            bool: {
              filter: filter.concat(getDocumentTypeFilterForTransactions(true)),
            },
          },
        },
      }
    );
    return maybe(response.hits.hits[0]?._source);
  }

  // we can expect the most detail of application metrics,
  // followed by transaction events, and then finally transaction metrics
  const [
    applicationMetricSample,
    transactionEventSample,
    transactionMetricSample,
  ] = await Promise.all([
    getApplicationMetricSample(),
    getTransactionEventSample(),
    getTransactionMetricSample(),
  ]);

  const sample = merge(
    {},
    transactionMetricSample,
    transactionEventSample,
    applicationMetricSample
  );

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
