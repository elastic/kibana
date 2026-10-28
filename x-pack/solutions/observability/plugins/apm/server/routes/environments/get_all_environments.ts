/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { termQuery } from '@kbn/observability-plugin/server';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
  RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
} from '../../../common/es_fields/apm';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import { ENVIRONMENT_FIELDS } from '../../../common/utils/environment_query';
import { getProcessorEventForTransactions } from '../../lib/helpers/transactions';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';

/**
 * This is used for getting *all* environments, and does not filter by range.
 * It's used in places where we get the list of all possible environments.
 * Environments are collected from both `service.environment` and the OTel
 * `deployment.environment.name` resource attribute (semconv >= 1.27), which the
 * `service.environment` alias does not cover.
 */
export async function getAllEnvironments({
  includeMissing = false,
  searchAggregatedTransactions,
  serviceName,
  apmEventClient,
  size,
}: {
  includeMissing?: boolean;
  searchAggregatedTransactions: boolean;
  serviceName?: string;
  apmEventClient: APMEventClient;
  size: number;
}) {
  const operationName = serviceName
    ? 'get_all_environments_for_service'
    : 'get_all_environments_for_all_services';

  const params = {
    apm: {
      events: [
        getProcessorEventForTransactions(searchAggregatedTransactions),
        ProcessorEvent.error,
        ProcessorEvent.metric,
      ],
    },
    // use timeout + min_doc_count to return as early as possible
    // if filter is not defined to prevent timeouts
    ...(!serviceName ? { timeout: '1ms' } : {}),
    track_total_hits: false,
    size: 0,
    query: {
      bool: {
        filter: [...termQuery(SERVICE_NAME, serviceName)],
      },
    },
    aggs: {
      environments: {
        terms: {
          field: SERVICE_ENVIRONMENT,
          size,
          ...(!serviceName ? { min_doc_count: 0 } : {}),
        },
      },
      otelEnvironments: {
        terms: {
          field: RESOURCE_ATTRIBUTES_DEPLOYMENT_ENVIRONMENT_NAME,
          size,
          ...(!serviceName ? { min_doc_count: 0 } : {}),
        },
      },
      ...(includeMissing
        ? {
            missingEnvironments: {
              filter: {
                bool: {
                  must_not: ENVIRONMENT_FIELDS.map((field) => ({ exists: { field } })),
                },
              },
            },
          }
        : {}),
    },
  };

  const { aggregations } = await apmEventClient.search(operationName, params);
  if (!aggregations) return [];

  const environments = uniq(
    [...aggregations.environments.buckets, ...aggregations.otelEnvironments.buckets].map(
      ({ key }) => key as string
    )
  );

  if ((aggregations.missingEnvironments?.doc_count ?? 0) > 0) {
    environments.push(ENVIRONMENT_NOT_DEFINED.value);
  }

  return environments;
}
