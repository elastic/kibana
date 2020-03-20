/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Setup } from '../../../helpers/setup_request';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  SERVICE_ENVIRONMENT
} from '../../../../../common/elasticsearch_fieldnames';
import { ALL_OPTION_VALUE } from '../../../../../common/agent_configuration_constants';

export async function getAllEnvironments({
  serviceName,
  setup
}: {
  serviceName: string | undefined;
  setup: Setup;
}) {
  const { client, indices } = setup;

  // omit filter for service.name if "All" option is selected
  const serviceNameFilter = serviceName
    ? [{ term: { [SERVICE_NAME]: serviceName } }]
    : [];

  const params = {
    index: [
      indices['apm_oss.metricsIndices'],
      indices['apm_oss.errorIndices'],
      indices['apm_oss.transactionIndices']
    ],
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            {
              terms: { [PROCESSOR_EVENT]: ['transaction', 'error', 'metric'] }
            },
            ...serviceNameFilter
          ]
        }
      },
      aggs: {
        environments: {
          terms: {
            field: SERVICE_ENVIRONMENT,
            size: 100
          }
        }
      }
    }
  };

  const resp = await client.search(params);
  const environments =
    resp.aggregations?.environments.buckets.map(
      bucket => bucket.key as string
    ) || [];
  return [ALL_OPTION_VALUE, ...environments];
}
