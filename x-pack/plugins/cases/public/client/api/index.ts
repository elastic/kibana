/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HttpStart } from 'kibana/public';
import { CasesByAlertId, CasesByAlertIDRequest, getCasesFromAlertsUrl } from '../../../common/api';
import { CasesUiStart } from '../../types';

export const createClientAPI = ({ http }: { http: HttpStart }): CasesUiStart['api'] => {
  return {
    getRelatedCases: async (
      alertId: string,
      query: CasesByAlertIDRequest
    ): Promise<CasesByAlertId> =>
      http.get<CasesByAlertId>(getCasesFromAlertsUrl(alertId), { query }),
  };
};
