/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { SearchParams } from 'elasticsearch';
import { OBSERVER_LISTENING } from '../../../common/elasticsearch_fieldnames';
import { Setup } from '../helpers/setup_request';

// Note: this logic is duplicated in tutorials/apm/envs/on_prem
export async function getServerStatus({ setup }: { setup: Setup }) {
  const { client, config } = setup;

  const params: SearchParams = {
    index: config.get('apm_oss.onboardingIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: {
            exists: {
              field: OBSERVER_LISTENING
            }
          }
        }
      }
    }
  };

  const resp = await client('search', params);

  return {
    dataFound: resp.hits.total >= 1
  };
}
