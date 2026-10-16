/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticsearchClient } from '@kbn/core/server';
import type { APMIndices } from '@kbn/apm-sources-access-plugin/server';
import { rangeQuery } from '@kbn/observability-plugin/server';
import { KIND } from '@kbn/apm-types/es_fields';
import {
  PROCESSOR_EVENT,
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
  SERVICE_ENVIRONMENT,
  SERVICE_NAME,
} from '../../../common/es_fields/apm';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import type { Environment } from '../../../common/environment_rt';
import { ENVIRONMENT_FIELDS } from '../../../common/utils/environment_query';

interface EnvironmentAggregations {
  environments: estypes.AggregationsStringTermsAggregate;
  otel_environments: estypes.AggregationsStringTermsAggregate;
  missing_environments: estypes.AggregationsFilterAggregate;
}

function getBucketKeys({ buckets }: estypes.AggregationsStringTermsAggregate): string[] {
  return Array.isArray(buckets) ? buckets.map(({ key }) => String(key)) : [];
}

/**
 * Returns environments for a service across both APM-processed and unprocessed
 * OTel data without mixing them. For a given service name a service is either
 * one or the other, so the two should-branches naturally return data from only
 * one source. Environments are read from both `service.environment` and the OTel
 * `deployment.environment.name` resource attribute (semconv >= 1.27).
 */
export async function getUnifiedEnvironments({
  esClient,
  indices,
  serviceName,
  start,
  end,
  size,
}: {
  esClient: ElasticsearchClient;
  indices: APMIndices;
  serviceName: string;
  start: number;
  end: number;
  size: number;
}): Promise<Environment[]> {
  const index = [indices.transaction, indices.span].filter(Boolean).join(',');
  if (!index) return [];

  const response = await esClient.search<never, EnvironmentAggregations>({
    index,
    size: 0,
    track_total_hits: false,
    query: {
      bool: {
        filter: [{ term: { [SERVICE_NAME]: serviceName } }, ...rangeQuery(start, end)],
        should: [
          // APM-processed: transactions are the authoritative environment source
          {
            bool: {
              filter: [{ term: { [PROCESSOR_EVENT]: 'transaction' } }],
            },
          },
          // Unprocessed OTel: server/consumer spans without processor.event
          {
            bool: {
              filter: [{ terms: { [KIND]: ['Server', 'Consumer'] } }],
              must_not: [{ exists: { field: PROCESSOR_EVENT } }],
            },
          },
        ],
        minimum_should_match: 1,
      },
    },
    aggs: {
      environments: {
        terms: {
          field: SERVICE_ENVIRONMENT,
          size,
          order: { _key: 'asc' as const },
        },
      },
      otel_environments: {
        terms: {
          field: RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
          size,
          order: { _key: 'asc' as const },
        },
      },
      missing_environments: {
        filter: {
          bool: {
            must_not: ENVIRONMENT_FIELDS.map((field) => ({ exists: { field } })),
          },
        },
      },
    },
  });

  const { aggregations } = response;
  if (!aggregations) return [];

  const environments = uniq([
    ...getBucketKeys(aggregations.environments),
    ...getBucketKeys(aggregations.otel_environments),
  ]).sort() as Environment[];

  if (aggregations.missing_environments.doc_count > 0) {
    environments.push(ENVIRONMENT_NOT_DEFINED.value as Environment);
  }

  return environments;
}
