/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SERVICE_ENVIRONMENT } from '../../../common/es_fields/apm';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import type { Environment } from '../../../common/environment_rt';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { hasUnsetValueForField } from './has_unset_value_for_field';
import { getSuggestionsWithTermsAggregation } from '../suggestions/get_suggestions_with_terms_aggregation';

/**
 * This is used for getting the list of environments for the environment selector,
 * filtered by range.
 */
export async function getEnvironments({
  searchAggregatedTransactions,
  serviceName,
  apmEventClient,
  size,
  start,
  end,
}: {
  apmEventClient: APMEventClient;
  serviceName?: string;
  searchAggregatedTransactions: boolean;
  size: number;
  start: number;
  end: number;
}): Promise<Environment[]> {
  const [hasUnsetEnvironments, resp] = await Promise.all([
    hasUnsetValueForField({
      apmEventClient,
      searchAggregatedTransactions,
      serviceName,
      fieldName: SERVICE_ENVIRONMENT,
      start,
      end,
    }),
    getSuggestionsWithTermsAggregation({
      fieldName: SERVICE_ENVIRONMENT,
      fieldValue: '',
      searchAggregatedTransactions,
      serviceName,
      apmEventClient,
      size,
      start,
      end,
    }),
  ]);

  const environments = resp.terms;

  if (hasUnsetEnvironments) {
    environments.push(ENVIRONMENT_NOT_DEFINED.value);
  }

  return environments as Environment[];
}
