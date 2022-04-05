/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExceptionListSummarySchema } from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { HttpStart } from 'kibana/public';
import { EXCEPTION_LIST_URL } from '../event_filters/constants';

export async function getHostIsolationExceptionSummary(
  http: HttpStart,
  filter?: string
): Promise<ExceptionListSummarySchema> {
  return http.get<ExceptionListSummarySchema>(`${EXCEPTION_LIST_URL}/summary`, {
    query: {
      filter,
      list_id: ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID,
      namespace_type: 'agnostic',
    },
  });
}
