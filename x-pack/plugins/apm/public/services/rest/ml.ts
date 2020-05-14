/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { HttpSetup } from 'kibana/public';
import {
  PROCESSOR_EVENT,
  SERVICE_NAME,
  TRANSACTION_TYPE
} from '../../../common/elasticsearch_fieldnames';
import {
  getMlJobId,
  getMlPrefix,
  encodeForMlApi
} from '../../../common/ml_job_constants';
import { callApi } from './callApi';
import { ESFilter } from '../../../typings/elasticsearch';
import { callApmApi } from './createCallApmApi';

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

async function getTransactionIndices(http: HttpSetup) {
  const indices = await callApmApi({
    method: 'GET',
    pathname: `/api/apm/settings/apm-indices`
  });
  return indices['apm_oss.transactionIndices'];
}

export async function startMLJob({
  serviceName,
  transactionType,
  http
}: {
  serviceName: string;
  transactionType: string;
  http: HttpSetup;
}) {
  const transactionIndices = await getTransactionIndices(http);
  const groups = [
    'apm',
    encodeForMlApi(serviceName),
    encodeForMlApi(transactionType)
  ];
  const filter: ESFilter[] = [
    { term: { [SERVICE_NAME]: serviceName } },
    { term: { [PROCESSOR_EVENT]: 'transaction' } },
    { term: { [TRANSACTION_TYPE]: transactionType } }
  ];
  return callApi<StartedMLJobApiResponse>(http, {
    method: 'POST',
    pathname: `/api/ml/modules/setup/apm_transaction`,
    body: {
      prefix: getMlPrefix(serviceName, transactionType),
      groups,
      indexPatternName: transactionIndices,
      startDatafeed: true,
      query: {
        bool: {
          filter
        }
      }
    }
  });
}

// https://www.elastic.co/guide/en/elasticsearch/reference/6.5/ml-get-job.html
export interface MLJobApiResponse {
  count: number;
  jobs: Array<{
    job_id: string;
  }>;
}

export type MLError = Error & { body?: { message?: string } };

export async function getHasMLJob({
  serviceName,
  transactionType,
  http
}: {
  serviceName: string;
  transactionType: string;
  http: HttpSetup;
}) {
  try {
    await callApi<MLJobApiResponse>(http, {
      method: 'GET',
      pathname: `/api/ml/anomaly_detectors/${getMlJobId(
        serviceName,
        transactionType
      )}`
    });
    return true;
  } catch (error) {
    if (
      error?.body?.statusCode === 404 &&
      error?.body?.attributes?.body?.error?.type ===
        'resource_not_found_exception'
    ) {
      return false; // false only if ML api responds with resource_not_found_exception
    }
    throw error;
  }
}
