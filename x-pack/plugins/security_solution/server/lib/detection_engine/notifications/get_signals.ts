/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ElasticsearchClient } from 'kibana/server';
import type { SignalSearchResponse, SignalSource } from '../signals/types';
import { buildSignalsSearchQuery } from './build_signals_query';

interface GetSignalsParams {
  from?: string;
  to?: string;
  size?: number;
  ruleId: string;
  index: string;
  esClient: ElasticsearchClient;
}

export const getSignals = async ({
  from,
  to,
  size,
  ruleId,
  index,
  esClient,
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

  const result = await esClient.search<SignalSource>(query);

  return result;
};
