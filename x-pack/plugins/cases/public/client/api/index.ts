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
import type { Cases, CasesStatus, CasesMetrics } from '../../../common/ui';
import { getCases, getCasesMetrics, getCasesStatus } from '../../api';
import type { CasesUiStart } from '../../types';

export const createClientAPI = ({ http }: { http: HttpStart }): CasesUiStart['api'] => {
  return {
    getRelatedCases: async (
      alertId: string,
      query: CasesByAlertIDRequest
    ): Promise<CasesByAlertId> =>
      http.get<CasesByAlertId>(getCasesFromAlertsUrl(alertId), { query }),
    cases: {
      find: (query: CasesFindRequest, signal?: AbortSignal): Promise<Cases> =>
        getCases({ http, query, signal }),
      getCasesStatus: (query: CasesStatusRequest, signal?: AbortSignal): Promise<CasesStatus> =>
        getCasesStatus({ http, query, signal }),
      getCasesMetrics: (query: CasesMetricsRequest, signal?: AbortSignal): Promise<CasesMetrics> =>
        getCasesMetrics({ http, signal, query }),
    },
  };
};
