/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AlertServices } from '../../../../../alerts/server';
import { SignalSearchResponse } from '../signals/types';
import { buildSignalsSearchQuery } from './build_signals_query';

interface GetSignalsParams {
  from?: string;
  to?: string;
  size?: number;
  ruleId: string;
  index: string;
  callCluster: AlertServices['callCluster'];
}

export const getSignals = async ({
  from,
  to,
  size,
  ruleId,
  index,
  callCluster,
}: GetSignalsParams): Promise<SignalSearchResponse> => {
  if (from == null || to == null) {
    throw Error('"from" or "to" was not provided to signals query');
  }

  const query = buildSignalsSearchQuery({
    index,
    ruleId,
    to,
    from,
    size,
  });

  const result: SignalSearchResponse = await callCluster('search', query);

  return result;
};
