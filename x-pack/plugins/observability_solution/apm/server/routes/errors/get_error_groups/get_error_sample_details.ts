/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rangeQuery, kqlQuery } from '@kbn/observability-plugin/server';
import { OBSERVER_VERSION_MAJOR } from '@kbn/observability-shared-plugin/common';
import {
  ERROR_EXCEPTION_STACKTRACE,
  ERROR_LOG_STACKTRACE,
  ERROR_STACK_TRACE,
} from '@kbn/discover-utils/src/field_constants';
import {
  AGENT_NAME,
  AGENT_VERSION,
  CONTAINER_ID,
  CONTAINER_IMAGE,
  ERROR_ID,
  HOST_ARCHITECTURE,
  HOST_HOSTNAME,
  HOST_NAME,
  HTTP_RESPONSE_STATUS_CODE,
  KUBERNETES_POD_UID,
  OBSERVER_HOSTNAME,
  OBSERVER_ID,
  OBSERVER_TYPE,
  OBSERVER_NAME,
  OBSERVER_VERSION,
  PARENT_ID,
  PROCESSOR_EVENT,
  PROCESSOR_NAME,
  SERVICE_NAME,
  TRACE_ID,
  SERVICE_ENVIRONMENT,
  SERVICE_FRAMEWORK_NAME,
  SERVICE_FRAMEWORK_VERSION,
  SERVICE_NODE_NAME,
  SERVICE_RUNTIME_NAME,
  SERVICE_RUNTIME_VERSION,
  SERVICE_LANGUAGE_NAME,
  SERVICE_LANGUAGE_VERSION,
  SERVICE_VERSION,
  HOST_OS_PLATFORM,
  TRANSACTION_ID,
  TRANSACTION_SAMPLED,
  TRANSACTION_TYPE,
  ERROR_CULPRIT,
  ERROR_PAGE_URL,
  ERROR_LOG_MESSAGE,
  URL_FULL,
  USER_ID,
  PROCESS_PID,
  PROCESS_ARGS,
  PROCESS_TITLE,
  AT_TIMESTAMP,
  ERROR_EXC_HANDLED,
  ERROR_EXC_TYPE,
  ERROR_EXC_MESSAGE,
  URL_DOMAIN,
  URL_ORIGINAL,
} from '../../../../common/es_fields/apm';
import { environmentQuery } from '../../../../common/utils/environment_query';
import { ApmDocumentType } from '../../../../common/document_type';
import { RollupInterval } from '../../../../common/rollup';
import { APMEventClient } from '../../../lib/helpers/create_es_client/create_apm_event_client';
import { getTransaction } from '../../transactions/get_transaction';
import { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { APMError } from '../../../../typings/es_schemas/ui/apm_error';
import { errorSampleDetailsMapping } from '../../../utils/es_fields_mappings';
import {
  KUBERNETES_CONTAINER_NAME,
  KUBERNETES_DEPLOYMENT_NAME,
  KUBERNETES_NAMESPACE,
  KUBERNETES_REPLICASET_NAME,
  KUBERNETES_CONTAINER_ID,
} from '../../../../common/es_fields/infra_metrics';

export interface ErrorSampleDetailsResponse {
  transaction: Transaction | undefined;
  error: APMError;
}

export async function getErrorSampleDetails({
  environment,
  kuery,
  serviceName,
  errorId,
  apmEventClient,
  start,
  end,
}: {
  environment: string;
  kuery: string;
  serviceName: string;
  errorId: string;
  apmEventClient: APMEventClient;
  start: number;
  end: number;
}): Promise<ErrorSampleDetailsResponse> {
  const params = {
    apm: {
      sources: [
        {
          documentType: ApmDocumentType.ErrorEvent as const,
          rollupInterval: RollupInterval.None,
        },
      ],
    },
    body: {
      track_total_hits: false,
      size: 1,
      query: {
        bool: {
          filter: [
            { term: { [SERVICE_NAME]: serviceName } },
            { term: { [ERROR_ID]: errorId } },
            ...rangeQuery(start, end),
            ...environmentQuery(environment),
            ...kqlQuery(kuery),
          ],
        },
      },
      fields: [
        AGENT_VERSION,
        AGENT_NAME,
        PARENT_ID,
        TRACE_ID,
        // AGENT_EPHEMERAL_ID,
        // OBSERVER_EPHEMERAL_ID,
        OBSERVER_HOSTNAME,
        OBSERVER_ID,
        OBSERVER_TYPE,
        OBSERVER_NAME,
        OBSERVER_VERSION,
        OBSERVER_VERSION_MAJOR,
        CONTAINER_ID,
        CONTAINER_IMAGE,
        PROCESSOR_NAME,
        PROCESSOR_EVENT,
        HOST_ARCHITECTURE,
        HOST_HOSTNAME,
        HOST_NAME,
        'host.ip',
        'http.request.method',
        HTTP_RESPONSE_STATUS_CODE,
        'http.version',
        KUBERNETES_POD_UID,
        KUBERNETES_NAMESPACE,
        KUBERNETES_REPLICASET_NAME,
        KUBERNETES_DEPLOYMENT_NAME,
        KUBERNETES_CONTAINER_ID,
        KUBERNETES_CONTAINER_NAME,
        SERVICE_NAME,
        SERVICE_ENVIRONMENT,
        SERVICE_FRAMEWORK_NAME,
        SERVICE_FRAMEWORK_VERSION,
        SERVICE_NODE_NAME,
        SERVICE_RUNTIME_NAME,
        SERVICE_RUNTIME_VERSION,
        SERVICE_LANGUAGE_NAME,
        SERVICE_LANGUAGE_VERSION,
        SERVICE_VERSION,
        PROCESS_ARGS,
        PROCESS_PID,
        PROCESS_TITLE,
        HOST_OS_PLATFORM,
        AT_TIMESTAMP,
        TRANSACTION_ID,
        TRANSACTION_SAMPLED,
        TRANSACTION_TYPE,
        ERROR_ID,
        ERROR_CULPRIT,
        'error.exception.attributes.response',
        // ERROR_EXC_ATTRIBUTES_RESPONSE,
        // ERROR_EXC_CODE,
        ERROR_EXC_MESSAGE,
        ERROR_EXC_TYPE,
        // ERROR_EXCEPTION_MODULE,
        ERROR_EXC_HANDLED,
        ERROR_EXCEPTION_STACKTRACE, // todo: fix me
        ERROR_PAGE_URL,
        ERROR_LOG_MESSAGE,
        ERROR_LOG_STACKTRACE, // todo: fixme
        ERROR_STACK_TRACE,
        URL_DOMAIN,
        URL_FULL,
        URL_ORIGINAL,
        USER_ID,
      ],
    },
  };

  const resp = await apmEventClient.search('get_error_sample_details', params);

  const errorNorm = errorSampleDetailsMapping(resp.hits.hits[0]?.fields);
  const transactionId = errorNorm?.transaction?.id;
  const traceId = errorNorm?.trace?.id;

  let transaction;
  if (transactionId && traceId) {
    transaction = await getTransaction({
      transactionId,
      traceId,
      apmEventClient,
      start,
      end,
    });
  }

  return {
    transaction,
    error: errorNorm,
  };
}
