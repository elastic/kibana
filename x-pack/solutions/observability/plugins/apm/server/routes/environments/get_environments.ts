/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uniq } from 'lodash';
import { ENVIRONMENT_NOT_DEFINED } from '../../../common/environment_filter_values';
import type { Environment } from '../../../common/environment_rt';
import { ENVIRONMENT_FIELDS } from '../../../common/utils/environment_query';
import type { APMEventClient } from '../../lib/helpers/create_es_client/create_apm_event_client';
import { hasUnsetValueForFields } from './has_unset_value_for_fields';
import { getSuggestionsWithTermsAggregation } from '../suggestions/get_suggestions_with_terms_aggregation';

/**
 * This is used for getting the list of environments for the environment selector,
 * filtered by range. Environments are collected from every field in
 * `ENVIRONMENT_FIELDS` so OTel documents that only carry
 * `deployment.environment.name` are included.
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
  const [hasUnsetEnvironments, ...suggestions] = await Promise.all([
    hasUnsetValueForFields({
      apmEventClient,
      searchAggregatedTransactions,
      serviceName,
      fieldNames: ENVIRONMENT_FIELDS,
      start,
      end,
    }),
    ...ENVIRONMENT_FIELDS.map((fieldName) =>
      getSuggestionsWithTermsAggregation({
        fieldName,
        fieldValue: '',
        searchAggregatedTransactions,
        serviceName,
        apmEventClient,
        size,
        start,
        end,
      })
    ),
  ]);

  const environments = uniq(suggestions.flatMap(({ terms }) => terms)).sort();

  if (hasUnsetEnvironments) {
    environments.push(ENVIRONMENT_NOT_DEFINED.value);
  }

  return environments as Environment[];
}
