/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Setup } from '../../../../lib/helpers/setup_request';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT,
} from '../../../../../common/elasticsearch_fieldnames';
import { ALL_OPTION_VALUE } from '../../../../../common/agent_configuration/all_option';

export async function getExistingEnvironmentsForService({
  serviceName,
  setup,
  size,
}: {
  serviceName: string | undefined;
  setup: Setup;
  size: number;
}) {
  const { internalClient, indices } = setup;

  const bool = serviceName
    ? { filter: [{ term: { [SERVICE_NAME]: serviceName } }] }
    : { must_not: [{ exists: { field: SERVICE_NAME } }] };

  const params = {
    index: indices.apmAgentConfigurationIndex,
    body: {
      size: 0,
      query: { bool },
      aggs: {
        environments: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            missing: ALL_OPTION_VALUE,
            size,
          },
        },
      },
    },
  };

  const resp = await internalClient.search(
    'get_existing_environments_for_service',
    params
  );
  const existingEnvironments =
    resp.aggregations?.environments.buckets.map(
      (bucket) => bucket.key as string
    ) || [];
  return existingEnvironments;
}
