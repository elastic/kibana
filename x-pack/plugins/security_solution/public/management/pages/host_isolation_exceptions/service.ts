/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ExceptionListItemSchema,
  FoundExceptionListItemSchema,
} from '@kbn/securitysolution-io-ts-list-types';
import { ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID } from '@kbn/securitysolution-list-constants';
import { HttpStart } from 'kibana/public';
import { EXCEPTION_LIST_ITEM_URL, EXCEPTION_LIST_URL } from '../event_filters/constants';
import { HOST_ISOLATION_EXCEPTIONS_LIST } from './constants';

async function createHostIsolationExceptionList(http: HttpStart) {
  try {
    await http.post<ExceptionListItemSchema>(EXCEPTION_LIST_URL, {
      body: JSON.stringify(HOST_ISOLATION_EXCEPTIONS_LIST),
    });
  } catch (err) {
    // Ignore 409 errors. List already created
    if (err.response?.status !== 409) {
      throw err;
    }
  }
}

export async function getHostIsolationExceptionsList(
  http: HttpStart
): Promise<FoundExceptionListItemSchema> {
  try {
    const entries = (await http.get(`${EXCEPTION_LIST_ITEM_URL}/_find`, {
      query: {
        list_id: [ENDPOINT_HOST_ISOLATION_EXCEPTIONS_LIST_ID],
        namespace_type: ['agnostic'],
        // filter,
      },
    })) as FoundExceptionListItemSchema;
    return entries;
  } catch (e) {
    // 404 if the list has not been created yet
    if (e.response?.status === 404) {
      await createHostIsolationExceptionList(http);
      return getHostIsolationExceptionsList(http);
    }
    throw e;
  }
}
