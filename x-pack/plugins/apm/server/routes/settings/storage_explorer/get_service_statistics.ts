/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { DocCountPerProcessorEventResponse } from './get_doc_count_per_processor_event';

export function getServiceStatistics({
  docCountPerProcessorEvent,
  totalTransactionsPerService,
  totalApmDocs,
  totalSizeInBytes,
}: {
  docCountPerProcessorEvent: DocCountPerProcessorEventResponse;
  totalTransactionsPerService: Record<string, number>;
  totalApmDocs?: number;
  totalSizeInBytes?: number;
}) {
  const serviceStatistics = docCountPerProcessorEvent.map(
    ({ serviceName, totalServiceDocs, sampledTransactionDocs, ...rest }) => {
      const size =
        totalSizeInBytes && totalApmDocs
          ? (totalServiceDocs / totalApmDocs) * totalSizeInBytes
          : undefined;

      const sampling =
        sampledTransactionDocs && totalTransactionsPerService[serviceName]
          ? sampledTransactionDocs / totalTransactionsPerService[serviceName]
          : 0;

      return {
        ...rest,
        serviceName,
        sampledTransactionDocs,
        size,
        sampling,
      };
    }
  );

  return serviceStatistics;
}
