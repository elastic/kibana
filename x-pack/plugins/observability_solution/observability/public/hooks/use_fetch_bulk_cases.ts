/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CaseStatuses } from '@kbn/cases-components';
import { useEffect, useState } from 'react';
import { useKibana } from '../utils/kibana_react';
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

export const useFetchBulkCases = ({
  ids = [],
}: {
  ids: string[];
}): { cases: Cases; isLoading: boolean; error?: Record<string, any> } => {
  const [cases, setCases] = useState<Cases>([]);
  const [error, setError] = useState();
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const { http } = useKibana().services;

  useEffect(() => {
    const getBulkCasesByIds = async () => {
      return http.post<CasesBulkGetResponse>(INTERNAL_BULK_GET_CASES_URL, {
        body: JSON.stringify({ ids }),
      });
    };
    if (ids.length) {
      setIsLoading(true);
      getBulkCasesByIds()
        .then((res) => setCases(res.cases))
        .catch((resError) => setError(resError))
        .finally(() => setIsLoading(false));
    }
  }, [http, ids]);

  return { cases, isLoading, error };
};
