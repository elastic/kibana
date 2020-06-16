/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AlertServices } from '../../../../../alerts/server';
import { buildSignalsSearchQuery } from './build_signals_query';

interface GetSignalsCount {
  from?: string;
  to?: string;
  ruleId: string;
  index: string;
  callCluster: AlertServices['callCluster'];
}

interface CountResult {
  count: number;
}

export const getSignalsCount = async ({
  from,
  to,
  ruleId,
  index,
  callCluster,
}: GetSignalsCount): Promise<number> => {
  if (from == null || to == null) {
    throw Error('"from" or "to" was not provided to signals count query');
  }

  const query = buildSignalsSearchQuery({
    index,
    ruleId,
    to,
    from,
  });

  const result: CountResult = await callCluster('count', query);

  return result.count;
};
