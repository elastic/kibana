/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { uniq } from 'lodash';
import { ApmPluginRequestHandlerContext } from '../../typings';
import { Setup } from '../../../lib/helpers/setup_request';
import { DocCountPerProcessorEventResponse } from './get_doc_count_per_processor_event';

export function getServiceStatistics({
  docCountPerProcessorEvent,
  totalTransactionsPerService,
  totalApmDocs,
  totalIndexDiskUsage,
}: {
  docCountPerProcessorEvent: DocCountPerProcessorEventResponse;
  totalTransactionsPerService: Record<string, number>;
  totalApmDocs: number;
  totalIndexDiskUsage?: number;
}) {
  const serviceStatistics = docCountPerProcessorEvent.map(
    ({ numberOfDocs, service, transaction, ...rest }) => {
      const size = totalIndexDiskUsage
        ? (numberOfDocs / totalApmDocs) * totalIndexDiskUsage
        : undefined;

      const sampling = totalTransactionsPerService[service]
        ? transaction / totalTransactionsPerService[service]
        : 0;

      return {
        ...rest,
        service,
        transaction,
        size,
        sampling,
      };
    }
  );

  return serviceStatistics;
}

export async function getNumberOfApmDocs({
  context,
  setup,
}: {
  context: ApmPluginRequestHandlerContext;
  setup: Setup;
}) {
  const {
    indices: { transaction, span, metric, error },
  } = setup;

  const index = uniq([transaction, span, metric, error]).join();
  const esClient = (await context.core).elasticsearch.client;

  const { count } = await esClient.asCurrentUser.count({
    index,
  });

  return count;
}
