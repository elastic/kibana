/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PROCESSOR_NAME } from '../../../common/constants';

// Note: this logic is duplicated in tutorials/apm/envs/on_prem
export async function getAgentStatus({ setup }) {
  const { client, config } = setup;

  const params = {
    index: [
      config.get('apm_oss.errorIndices'),
      config.get('apm_oss.transactionIndices')
    ],
    body: {
      size: 0,
      query: {
        bool: {
          should: [
            { term: { [PROCESSOR_NAME]: 'error' } },
            { term: { [PROCESSOR_NAME]: 'transaction' } },
            { term: { [PROCESSOR_NAME]: 'metric' } },
            { term: { [PROCESSOR_NAME]: 'sourcemap' } }
          ]
        }
      }
    }
  };

  const resp = await client('search', params);

  return {
    dataFound: resp.hits.total >= 1
  };
}
