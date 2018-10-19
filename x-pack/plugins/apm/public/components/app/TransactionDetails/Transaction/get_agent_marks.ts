/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get, sortBy } from 'lodash';
import { Transaction } from 'x-pack/plugins/apm/typings/Transaction';

export function getAgentMarks(transaction: Transaction) {
  const agents: {
    [key: string]: number;
  } = get(transaction, 'transaction.marks.agent', {});
  const sortedAgents = sortBy(Object.entries(agents), '1');

  return sortedAgents.map(([name, us]) => ({ name, us: us * 1000 }));
}
