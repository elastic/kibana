/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import chrome from 'ui/chrome';
import { callApi } from './callApi';
import { SERVICE_NAME, TRANSACTION_TYPE } from '../../../common/constants';

export async function startMlJob({ serviceName, transactionType }) {
  const apmIndexPattern = chrome.getInjected('apmIndexPattern');
  return callApi({
    method: 'POST',
    pathname: `/api/ml/modules/setup/apm_transaction`,
    body: JSON.stringify({
      prefix: `${serviceName}-${transactionType}-`.toLowerCase(),
      groups: ['apm', serviceName.toLowerCase(), transactionType.toLowerCase()],
      indexPatternName: apmIndexPattern,
      startDatafeed: true,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [TRANSACTION_TYPE]: transactionType } }
          ]
        }
      }
    })
  });
}
