/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  QueryAlerts,
  AlertSearchResponse,
  BasicSignals,
  AlertsIndex,
  Privilege,
  CasesFromAlertsResponse,
} from '../types';
import { alertsMock, mockSignalIndex, mockUserPrivilege, mockCaseIdsFromAlertId } from '../mock';

export const fetchQueryAlerts = async <Hit, Aggregations>({
  query,
  signal,
}: QueryAlerts): Promise<AlertSearchResponse<Hit, Aggregations>> =>
  Promise.resolve(alertsMock as AlertSearchResponse<Hit, Aggregations>);

export const getSignalIndex = async ({ signal }: BasicSignals): Promise<AlertsIndex> =>
  Promise.resolve(mockSignalIndex);

export const getUserPrivilege = async ({ signal }: BasicSignals): Promise<Privilege> =>
  Promise.resolve(mockUserPrivilege);

export const createSignalIndex = async ({ signal }: BasicSignals): Promise<AlertsIndex> =>
  Promise.resolve(mockSignalIndex);

// do not delete
export const getCaseIdsFromAlertId = async ({
  alertId,
}: {
  alertId: string;
}): Promise<CasesFromAlertsResponse> => Promise.resolve(mockCaseIdsFromAlertId);
