/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ESSearchHit } from '../../../../typings/elasticsearch';
import {
  SERVICE_NAME,
  SERVICE_ENVIRONMENT
} from '../../../../common/elasticsearch_fieldnames';
import { Setup } from '../../helpers/setup_request';
import { AgentConfiguration } from './configuration_types';

export async function searchConfigurations({
  serviceName,
  environment,
  setup
}: {
  serviceName: string;
  environment?: string;
  setup: Setup;
}) {
  const { internalClient, indices } = setup;
  const environmentFilter = environment
    ? [
        {
          constant_score: {
            filter: { term: { [SERVICE_ENVIRONMENT]: { value: environment } } },
            boost: 1
          }
        }
      ]
    : [];

  // In the following `constant_score` is being used to disable IDF calculation (where frequency of a term influences scoring)
  // Additionally a boost has been added to service.name to ensure it scores higher
  // if there is tie between a config with a matching service.name and a config with a matching environment
  const params = {
    index: indices.apmAgentConfigurationIndex,
    body: {
      query: {
        bool: {
          minimum_should_match: 2,
          should: [
            {
              constant_score: {
                filter: { term: { [SERVICE_NAME]: { value: serviceName } } },
                boost: 2
              }
            },
            ...environmentFilter,
            { bool: { must_not: [{ exists: { field: SERVICE_NAME } }] } },
            { bool: { must_not: [{ exists: { field: SERVICE_ENVIRONMENT } }] } }
          ]
        }
      }
    }
  };

  const resp = await internalClient.search<AgentConfiguration, typeof params>(
    params
  );

  return resp.hits.hits[0] as ESSearchHit<AgentConfiguration> | undefined;
}
