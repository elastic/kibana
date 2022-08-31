/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import type { IndexedHostsResponse } from './index_endpoint_hosts';
import { EndpointDocGenerator } from '../generate_data';

import { wrapErrorAndRejectPromise } from './utils';

/**
 * Indexes the requested number of documents for the endpoint host metrics currently being output by the generator.
 *
 *
 *
 * @param numDocs
 * @param client
 * @param metricsIndex
 * @param generator
 * @param indexedHosts
 */
export async function indexEndpointMetricsDocs({
  numDocs,
  client,
  metricsIndex,
  generator,
  indexedHosts,
}: {
  numDocs: number;
  client: Client;
  metricsIndex: string;
  generator: EndpointDocGenerator;
  indexedHosts: IndexedHostsResponse;
}): Promise<void> {
  const timeBetweenDocs = 24 * 3600 * 1000; // 24h between metrics documents
  const timestamp = new Date().getTime();

  for (let i = 0; i < indexedHosts.hosts.length; i++) {
    for (let j = 0; j < numDocs; j++) {
      const hostMetrics = generator.generateHostMetricsData(
        timestamp - timeBetweenDocs * (numDocs - j - 1),
        indexedHosts.hosts[i],
        EndpointDocGenerator.createDataStreamFromIndex(metricsIndex)
      );
      await client
        .index({
          index: metricsIndex,
          body: hostMetrics,
          op_type: 'create',
          refresh: 'wait_for',
        })
        .catch(wrapErrorAndRejectPromise);
    }
  }
}
