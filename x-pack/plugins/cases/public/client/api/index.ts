/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import type {
  CasesByAlertIDRequest,
  GetRelatedCasesByAlertResponse,
  CasesFindRequest,
  CasesStatusRequest,
  CasesMetricsRequest,
} from '../../../common/types/api';
import { getCasesFromAlertsUrl } from '../../../common/api';
import { bulkGetCases, getCases, getCasesMetrics, getCasesStatus } from '../../api';
import type { CasesFindResponseUI, CasesStatus, CasesMetrics } from '../../../common/ui';
import type { CasesPublicStart } from '../../types';

export const createClientAPI = ({ http }: { http: HttpStart }): CasesPublicStart['api'] => {
  return {
    getRelatedCases: async (
      alertId: string,
      query: CasesByAlertIDRequest
    ): Promise<GetRelatedCasesByAlertResponse> =>
      http.get<GetRelatedCasesByAlertResponse>(getCasesFromAlertsUrl(alertId), { query }),
    cases: {
      find: (query: CasesFindRequest, signal?: AbortSignal): Promise<CasesFindResponseUI> =>
        getCases({ http, query, signal }),
      getCasesStatus: (query: CasesStatusRequest, signal?: AbortSignal): Promise<CasesStatus> =>
        getCasesStatus({ http, query, signal }),
      getCasesMetrics: (query: CasesMetricsRequest, signal?: AbortSignal): Promise<CasesMetrics> =>
        getCasesMetrics({ http, signal, query }),
      bulkGet: (params, signal?: AbortSignal) => bulkGetCases({ http, signal, params }),
    },
  };
};
