/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESFilter } from 'elasticsearch';
import chrome from 'ui/chrome';
import { SERVICE_NAME, TRANSACTION_TYPE } from '../../../common/constants';
import { callApi } from './callApi';

export function getMlPrefix(serviceName: string, transactionType?: string) {
  return `${serviceName}-${
    transactionType ? transactionType + '-' : ''
  }`.toLowerCase();
}

interface MlResponseItem {
  id: string;
  success: boolean;
  error?: {
    msg: string;
    body: string;
    path: string;
    response: string;
    statusCode: number;
  };
}

interface StartedMLJobApiResponse {
  datafeeds: MlResponseItem[];
  jobs: MlResponseItem[];
}

export async function startMLJob({
  serviceName,
  transactionType
}: {
  serviceName: string;
  transactionType?: string;
}) {
  const indexPatternName = chrome.getInjected('apmIndexPatternTitle');
  const groups = ['apm', serviceName.toLowerCase()];
  const filter: ESFilter[] = [{ term: { [SERVICE_NAME]: serviceName } }];
  if (transactionType) {
    groups.push(transactionType.toLowerCase());
    filter.push({ term: { [TRANSACTION_TYPE]: transactionType } });
  }
  return callApi<StartedMLJobApiResponse>({
    method: 'POST',
    pathname: `/api/ml/modules/setup/apm_transaction`,
    body: JSON.stringify({
      prefix: getMlPrefix(serviceName, transactionType),
      groups,
      indexPatternName,
      startDatafeed: true,
      query: {
        bool: {
          filter
        }
      }
    })
  });
}

// https://www.elastic.co/guide/en/elasticsearch/reference/6.5/ml-get-job.html
export interface MLJobApiResponse {
  count: number;
  jobs: Array<{
    job_id: string;
    [key: string]: any;
  }>;
}

export async function getMLJob({
  serviceName,
  transactionType,
  anomalyName = 'high_mean_response_time'
}: {
  serviceName: string;
  transactionType?: string;
  anomalyName?: string;
}) {
  return callApi<MLJobApiResponse>({
    method: 'GET',
    pathname: `/api/ml/anomaly_detectors/${getMlPrefix(
      serviceName,
      transactionType
    )}${anomalyName}`
  });
}
