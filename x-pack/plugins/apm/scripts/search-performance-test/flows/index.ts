/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import agent from 'elastic-apm-node';
import { LatencyAggregationType } from '../../../common/latency_aggregation_types';
import { serviceInventory, serviceOverview } from '../pages';

export async function serviceInventoryToOverview({
  start,
  end,
  offset,
}: {
  start: string;
  end: string;
  offset?: string;
}) {
  const transaction = agent.startTransaction(
    'serviceInventoryToOverview',
    'search-performance-test'
  );

  try {
    const { services } = await serviceInventory({
      start,
      end,
    });

    await serviceOverview({
      start,
      end,
      serviceName: services[0].serviceName,
      transactionType: services[0].transactionType,
      offset,
      environment: 'ENVIRONMENT_ALL',
      latencyAggregationType: LatencyAggregationType.avg,
      kuery: '',
    });
    transaction?.setOutcome('success');
  } catch (err) {
    transaction?.setOutcome('failure');
    throw err;
  } finally {
    transaction?.end();
  }
}
