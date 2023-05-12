/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  CasesByAlertId,
  CasesByAlertIDRequest,
  CasesFindRequest,
  CasesStatusRequest,
  CasesMetricsRequest,
} from '../../../common/api';
import { getCasesFromAlertsUrl } from '../../../common/api';
import type { CasesFindResponseUI, CasesStatus, CasesMetrics } from '../../../common/ui';
import type { CasesUiStart } from '../../types';

export const createClientAPI = ({ http }: { http: HttpStart }): CasesUiStart['api'] => {
  return {
    getRelatedCases: async (
      alertId: string,
      query: CasesByAlertIDRequest
    ): Promise<CasesByAlertId> =>
      http.get<CasesByAlertId>(getCasesFromAlertsUrl(alertId), { query }),
    cases: {
      find: async (query: CasesFindRequest, signal?: AbortSignal): Promise<CasesFindResponseUI> => {
        const { getCases } = await import('../../api');
        return getCases({ http, query, signal });
      },
      getCasesStatus: async (
        query: CasesStatusRequest,
        signal?: AbortSignal
      ): Promise<CasesStatus> => {
        const { getCasesStatus } = await import('../../api');
        return getCasesStatus({ http, query, signal });
      },
      getCasesMetrics: async (
        query: CasesMetricsRequest,
        signal?: AbortSignal
      ): Promise<CasesMetrics> => {
        const { getCasesMetrics } = await import('../../api');
        return getCasesMetrics({ http, query, signal });
      },
      bulkGet: async (params, signal?: AbortSignal) => {
        const { bulkGetCases } = await import('../../api');
        return bulkGetCases({ http, signal, params });
      },
    },
  };
};
