/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ESFilter } from '@kbn/core/types/elasticsearch';
import {
  ERROR_GROUP_ID,
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_NAME,
  TRANSACTION_TYPE,
} from '../../../../common/elasticsearch_fieldnames';
import { ENVIRONMENT_ALL } from '../../../../common/environment_filter_values';
import { UIProcessorEvent } from '../../../../common/processor_event';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { ApmUrlParams } from '../../../context/url_params_context/types';

export function getBoolFilter({
  groupId,
  processorEvent,
  serviceName,
  environment,
  urlParams,
}: {
  groupId?: string;
  processorEvent?: UIProcessorEvent;
  serviceName?: string;
  environment?: string;
  urlParams: ApmUrlParams;
}) {
  const boolFilter: ESFilter[] = [];

  if (serviceName) {
    boolFilter.push({
      term: { [SERVICE_NAME]: serviceName },
    });
  }

  boolFilter.push(...environmentQuery(environment ?? ENVIRONMENT_ALL.value));

  if (urlParams.transactionType) {
    boolFilter.push({
      term: { [TRANSACTION_TYPE]: urlParams.transactionType },
    });
  }

  switch (processorEvent) {
    case 'transaction':
      boolFilter.push({
        term: { [PROCESSOR_EVENT]: 'transaction' },
      });

      if (urlParams.transactionName) {
        boolFilter.push({
          term: { [TRANSACTION_NAME]: urlParams.transactionName },
        });
      }

      if (urlParams.transactionType) {
        boolFilter.push({
          term: { [TRANSACTION_TYPE]: urlParams.transactionType },
        });
      }
      break;

    case 'error':
      boolFilter.push({
        term: { [PROCESSOR_EVENT]: 'error' },
      });

      if (groupId) {
        boolFilter.push({
          term: { [ERROR_GROUP_ID]: groupId },
        });
      }
      break;

    case 'metric':
      boolFilter.push({
        term: { [PROCESSOR_EVENT]: 'metric' },
      });
      break;

    default:
      boolFilter.push({
        bool: {
          should: [
            { term: { [PROCESSOR_EVENT]: 'error' } },
            { term: { [PROCESSOR_EVENT]: 'transaction' } },
            { term: { [PROCESSOR_EVENT]: 'metric' } },
          ],
        },
      });
  }

  return boolFilter;
}
