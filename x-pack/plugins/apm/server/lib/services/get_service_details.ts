/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransactionRaw } from '../../../typings/es_schemas/raw/transaction_raw';
import { Container } from '../../../typings/es_schemas/raw/fields/container';
import { ProcessorEvent } from '../../../common/processor_event';
import {
  SERVICE_NAME,
  SERVICE_NODE_NAME,
  SERVICE,
  AGENT,
  HOST,
  CONTAINER,
  KUBERNETES,
  CLOUD,
  PROCESSOR_EVENT,
} from '../../../common/elasticsearch_fieldnames';
import { rangeFilter } from '../../../common/utils/range_filter';
import { getBucketSize } from '../helpers/get_bucket_size';
import { Setup, SetupTimeRange } from '../helpers/setup_request';

type ServiceDetails = Pick<
  TransactionRaw,
  'service' | 'agent' | 'host' | 'container' | 'kubernetes' | 'cloud'
>;

interface IContainer extends Container {
  avgNumberInstances: number | null;
}

type ServiceDetailsResponse = Omit<ServiceDetails, 'container'> & {
  container?: IContainer;
};

export async function getServiceDetails({
  serviceName,
  setup,
}: {
  serviceName: string;
  setup: Setup & SetupTimeRange;
}): Promise<ServiceDetailsResponse | undefined> {
  const { start, end, apmEventClient } = setup;
  const { intervalString } = getBucketSize({ start, end });

  const filter = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: ProcessorEvent.transaction } },
    { range: rangeFilter(start, end) },
  ];

  const params = {
    apm: {
      events: [ProcessorEvent.transaction],
    },
    body: {
      size: 1,
      _source: [SERVICE, AGENT, HOST, CONTAINER, KUBERNETES, CLOUD],
      query: { bool: { filter } },
      aggs: {
        histogram: {
          date_histogram: {
            field: '@timestamp',
            fixed_interval: intervalString,
            min_doc_count: 0,
            extended_bounds: { min: start, max: end },
          },
          aggs: {
            total_instances: { cardinality: { field: SERVICE_NODE_NAME } },
          },
        },
        avgNumberInstances: {
          avg_bucket: { buckets_path: 'histogram>total_instances' },
        },
      },
    },
  };

  const response = await apmEventClient.search(params);

  if (response.hits.total.value === 0) {
    return;
  }

  const source = response.hits.hits[0]._source as ServiceDetails;

  const avgNumberInstances =
    response.aggregations?.avgNumberInstances.value ?? null;

  const container = source.container
    ? { ...source.container, avgNumberInstances }
    : undefined;

  return { ...source, container };
}
