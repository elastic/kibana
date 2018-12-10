/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  TRANSACTION_TYPE,
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  TRANSACTION_NAME,
  SERVICE_NAME
} from '../../../../common/constants';

export function getBoolFilter(urlParams) {
  const boolFilter = [
    {
      range: {
        '@timestamp': {
          gte: new Date(urlParams.start).getTime(),
          lte: new Date(urlParams.end).getTime(),
          format: 'epoch_millis'
        }
      }
    }
  ];

  if (urlParams.serviceName) {
    boolFilter.push({
      term: { [SERVICE_NAME]: urlParams.serviceName }
    });
  }

  switch (urlParams.processorEvent) {
    case 'transaction':
      boolFilter.push({
        term: { [PROCESSOR_EVENT]: 'transaction' }
      });

      if (urlParams.transactionName) {
        boolFilter.push({
          term: { [`${TRANSACTION_NAME}.keyword`]: urlParams.transactionName }
        });
      }

      if (urlParams.transactionType) {
        boolFilter.push({
          term: { [TRANSACTION_TYPE]: urlParams.transactionType }
        });
      }
      break;

    case 'error':
      boolFilter.push({
        term: { [PROCESSOR_EVENT]: 'error' }
      });

      if (urlParams.errorGroupId) {
        boolFilter.push({
          term: { [ERROR_GROUP_ID]: urlParams.errorGroupId }
        });
      }
      break;

    default:
      boolFilter.push({
        bool: {
          should: [
            { term: { [PROCESSOR_EVENT]: 'error' } },
            { term: { [PROCESSOR_EVENT]: 'transaction' } }
          ]
        }
      });
  }

  return boolFilter;
}
