/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Note: this logic is duplicated in tutorials/apm/envs/on_prem
export async function getServerStatus({ setup }) {
  const { client, config } = setup;

  const params = {
    index: config.get('apm_oss.onboardingIndices'),
    body: {
      size: 0,
      query: {
        bool: {
          filter: {
            exists: {
              field: 'listening'
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
