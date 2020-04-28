/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  DETECTION_ENGINE_QUERY_SIGNALS_URL,
  DETECTION_ENGINE_SIGNALS_STATUS_URL,
  DETECTION_ENGINE_INDEX_URL,
  DETECTION_ENGINE_PRIVILEGES_URL,
} from '../../../../common/constants';
import { KibanaServices } from '../../../lib/kibana';
import {
  BasicSignals,
  Privilege,
  QuerySignals,
  SignalSearchResponse,
  SignalsIndex,
  UpdateSignalStatusProps,
} from './types';

/**
 * Fetch Signals by providing a query
 *
 * @param query String to match a dsl
 * @param signal to cancel request
 *
 * @throws An error if response is not OK
 */
export const fetchQuerySignals = async <Hit, Aggregations>({
  query,
  signal,
}: QuerySignals): Promise<SignalSearchResponse<Hit, Aggregations>> =>
  KibanaServices.get().http.fetch<SignalSearchResponse<Hit, Aggregations>>(
    DETECTION_ENGINE_QUERY_SIGNALS_URL,
    {
      method: 'POST',
      body: JSON.stringify(query),
      signal,
    }
  );

/**
 * Update signal status by query
 *
 * @param query of signals to update
 * @param status to update to('open' / 'closed')
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const updateSignalStatus = async ({
  query,
  status,
  signal,
}: UpdateSignalStatusProps): Promise<unknown> =>
  KibanaServices.get().http.fetch(DETECTION_ENGINE_SIGNALS_STATUS_URL, {
    method: 'POST',
    body: JSON.stringify({ status, ...query }),
    signal,
  });

/**
 * Fetch Signal Index
 *
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getSignalIndex = async ({ signal }: BasicSignals): Promise<SignalsIndex> =>
  KibanaServices.get().http.fetch<SignalsIndex>(DETECTION_ENGINE_INDEX_URL, {
    method: 'GET',
    signal,
  });

/**
 * Get User Privileges
 *
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const getUserPrivilege = async ({ signal }: BasicSignals): Promise<Privilege> =>
  KibanaServices.get().http.fetch<Privilege>(DETECTION_ENGINE_PRIVILEGES_URL, {
    method: 'GET',
    signal,
  });

/**
 * Create Signal Index if needed it
 *
 * @param signal AbortSignal for cancelling request
 *
 * @throws An error if response is not OK
 */
export const createSignalIndex = async ({ signal }: BasicSignals): Promise<SignalsIndex> =>
  KibanaServices.get().http.fetch<SignalsIndex>(DETECTION_ENGINE_INDEX_URL, {
    method: 'POST',
    signal,
  });
