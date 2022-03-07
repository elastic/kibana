/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { HttpStart } from 'kibana/public';
import { CasesByAlertId, getCasesFromAlertsUrl } from '../../../common/api';

export const createClientAPI = ({ http }: { http: HttpStart }) => {
  return {
    getRelatedCases: async (alertId: string): Promise<CasesByAlertId> =>
      (await http.get(getCasesFromAlertsUrl(alertId))) as CasesByAlertId,
  };
};
