/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FunctionRegistrationParameters } from '.';
import { FindSLO, KibanaSavedObjectsSLORepository } from '../services/slo';
import { DefaultSummarySearchClient } from '../services/slo/summary_search_client';

export function registerGetObservabilitySLOFunction({
  esClient,
  soClient,
  logger,
  spaceId,
  registerFunction,
}: FunctionRegistrationParameters) {
  registerFunction(
    {
      name: 'get_observabililty_slos_for_apm_services',
      contexts: ['observability'],
      description: 'Gets APM services SLOs .',
      descriptionForUser: 'Gets APM services SLOs.',
      parameters: {
        type: 'object',
        properties: {
          serviceNames: {
            type: 'array',
            items: {
              type: 'string',
              description: 'Find SLOs for service names.',
            },
          },
        },
        required: ['serviceNames'],
      } as const,
    },
    async ({ arguments: args }, signal) => {
      const repository = new KibanaSavedObjectsSLORepository(soClient);
      const summarySearchClient = new DefaultSummarySearchClient(esClient, logger, spaceId);
      const findSLO = new FindSLO(repository, summarySearchClient);

      const response = await findSLO.execute({
        kqlQuery: args.serviceNames.map((value) => `service.name: "${value}"`).join(' OR '),
        perPage: '100',
      });

      const mapped = response.results.map((result) =>
        result.indicator.type === 'sli.apm.transactionDuration' ||
        result.indicator.type === 'sli.apm.transactionErrorRate'
          ? {
              'slo.name': result.name,
              'slo.id': result.id,
              'service.name': result.indicator.params.service,
              'slo.status': result.summary.status,
              'sli.value': result.summary.sliValue,
              'slo.error_budget': result.summary.errorBudget,
            }
          : undefined
      );

      return {
        content: mapped,
      };
    }
  );
}
