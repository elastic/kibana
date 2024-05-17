/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpStart } from '@kbn/core/public';
import { getCasesFromAlertsUrl } from '../../../common/api';
import type {
  CasesByAlertIDRequest,
  CasesFindRequest,
  CasesMetricsRequest,
  CasesStatusRequest,
  GetRelatedCasesByAlertResponse,
} from '../../../common/types/api';
import type { CasesFindResponseUI, CasesMetrics, CasesStatus } from '../../../common/ui';
import { bulkGetCases, getCases, getCasesMetrics, getCasesStatus } from '../../api';
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
