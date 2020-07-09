/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { QueryAlerts, AlertSearchResponse, BasicSignals, AlertsIndex, Privilege } from '../types';
import { alertsMock, mockSignalIndex, mockUserPrivilege } from '../mock';

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
