/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { LegacyAPICaller } from 'kibana/server';
import { getIndexState } from '../../common/get_index_state';
import { ResolveIndexResponseFromES } from '../../common/types';

type StatusCheckResult = Record<string, 'open' | 'closed'>;

export const esIndicesStateCheck = async (
  callAsUser: LegacyAPICaller,
  indices: string[]
): Promise<StatusCheckResult> => {
  const response: ResolveIndexResponseFromES = await callAsUser('transport.request', {
    method: 'GET',
    path: `/_resolve/index/*`,
    query: {
      expand_wildcards: 'all',
    },
  });

  const result: StatusCheckResult = {};

  indices.forEach((index) => {
    result[index] = getIndexState(index, response);
  });

  return result;
};
