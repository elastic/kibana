/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from '@kbn/core/public';
import {
  CasesByAlertId,
  CasesByAlertIDRequest,
  CasesFindRequest,
  getCasesFromAlertsUrl,
  CasesStatusRequest,
  CasesStatusResponse,
} from '../../../common/api';
import { CASE_STATUS_URL } from '../../../common/constants';
import { Cases, CasesStatus } from '../../../common/ui';
import { getCases, getCasesStatus } from '../../api';
import { CasesUiStart } from '../../types';

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
      getAllCasesMetrics: (query: CasesStatusRequest): Promise<CasesStatusResponse> =>
        http.get<CasesStatusResponse>(CASE_STATUS_URL, { query }),
      getCasesStatus: (query: CasesStatusRequest, signal?: AbortSignal): Promise<CasesStatus> =>
        getCasesStatus({ http, query, signal }),
    },
  };
};
