/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getDocCountPerProcessorEvent } from './get_doc_count_per_processor_event';
import { ApmPluginRequestHandlerContext } from '../../typings';
import { Setup } from '../../../lib/helpers/setup_request';
import { IndexLifecyclePhaseSelectOption } from '../../../../common/storage_explorer_types';
import { getTotalTransactionsPerService } from './get_total_transactions_per_service';

export async function getServiceStatistics({
  setup,
  context,
  indexLifecyclePhase,
  probability,
  start,
  end,
  environment,
  kuery,
  searchAggregatedTransactions,
}: {
  setup: Setup;
  context: ApmPluginRequestHandlerContext;
  indexLifecyclePhase: IndexLifecyclePhaseSelectOption;
  probability: number;
  start: number;
  end: number;
  environment: string;
  kuery: string;
  searchAggregatedTransactions: boolean;
}) {
  const [docCountPerProcessorEvent, totalTransactionsPerService] =
    await Promise.all([
      getDocCountPerProcessorEvent({
        setup,
        context,
        indexLifecyclePhase,
        probability,
        environment,
        kuery,
        start,
        end,
      }),
      getTotalTransactionsPerService({
        setup,
        searchAggregatedTransactions,
        indexLifecyclePhase,
        probability,
        environment,
        kuery,
        start,
        end,
      }),
    ]);

  const serviceStatistics = docCountPerProcessorEvent.map(
    ({ serviceName, sampledTransactionDocs, ...rest }) => {
      const sampling =
        sampledTransactionDocs && totalTransactionsPerService[serviceName]
          ? Math.min(
              sampledTransactionDocs / totalTransactionsPerService[serviceName],
              1
            )
          : 0;

      return {
        ...rest,
        serviceName,
        sampling,
      };
    }
  );

  return serviceStatistics;
}
