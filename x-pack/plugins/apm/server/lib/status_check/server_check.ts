/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PROCESSOR_EVENT } from '../../../common/constants';
import { Setup } from '../helpers/setup_request';

interface ServerStatusESResponse {
  hits: {
    hits: Array<{
      observer: {
        listening: string;
        hostname: string;
        id: string;
        ephemeral_id: string;
        type: string;
        version: string;
        version_major: number;
      };
      '@timestamp': string;
      ecs: {
        version: string;
      };
      host: {
        name: string;
      };
      processor: {
        name: 'onboarding';
        event: 'onboarding';
      };
    }>;
  };
}
export interface ServerStatusAPIResponse {
  dataFound: boolean;
  latest?: ServerStatusESResponse['hits']['hits'][0];
}

// Note: this logic is duplicated in tutorials/apm/envs/on_prem
export async function getServerStatus({ setup }: { setup: Setup }) {
  const { client, config } = setup;

  const params = {
    index: config.get('apm_oss.onboardingIndices') as string,
    body: {
      size: 1,
      sort: [{ '@timestamp': { order: 'desc' } }],
      query: {
        bool: {
          filter: { term: { [PROCESSOR_EVENT]: 'transaction' } }
        }
      }
    }
  };

  const resp = await client<ServerStatusESResponse>('search', params);

  return {
    dataFound: resp.hits.total >= 1,
    latest: resp.hits.hits[0] && resp.hits.hits[0]._source
  };
}
