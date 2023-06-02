/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-components';
import { HttpStart } from '@kbn/core-http-browser';

const INTERNAL_BULK_GET_CASES_URL = '/internal/cases/_bulk_get';

export interface Case {
  title: string;
  description: string;
  status: CaseStatuses;
  totalComment: number;
  created_at: string;
  created_by: {
    email: string | null | undefined;
    full_name: string | null | undefined;
    username: string | null | undefined;
  };
  id: string;
  owner: string;
  version: string;
}

export type Cases = Case[];

export interface CasesBulkGetResponse {
  cases: Cases;
  errors: Array<{
    caseId: string;
    error: string;
    message: string;
    status?: number;
  }>;
}

export const bulkGetCases = async (
  http: HttpStart,
  params: { ids: string[] },
  signal?: AbortSignal
): Promise<CasesBulkGetResponse> => {
  const res = await http.post<CasesBulkGetResponse>(INTERNAL_BULK_GET_CASES_URL, {
    body: JSON.stringify({ ...params }),
    signal,
  });

  return res;
};
