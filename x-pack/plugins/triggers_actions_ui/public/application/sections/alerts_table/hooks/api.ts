/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core-http-browser';
import type {
  CaseResponse,
  CasesBulkGetRequestCertainFields,
  CasesBulkGetResponseCertainFields,
} from '@kbn/cases-plugin/common';
import { INTERNAL_BULK_GET_CASES_URL } from '@kbn/cases-plugin/common';

export const bulkGetCases = async <Field extends keyof CaseResponse = keyof CaseResponse>(
  http: HttpStart,
  params: CasesBulkGetRequestCertainFields<Field>,
  signal?: AbortSignal
): Promise<CasesBulkGetResponseCertainFields<Field>> => {
  const res = await http.post<CasesBulkGetResponseCertainFields<Field>>(
    INTERNAL_BULK_GET_CASES_URL,
    {
      body: JSON.stringify({ ...params }),
      signal,
    }
  );

  return res;
};
