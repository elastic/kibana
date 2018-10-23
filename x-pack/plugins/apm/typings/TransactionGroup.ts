/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transaction } from './Transaction';

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// export interface ITransactionGroup {
//   name: string;
//   serviceName?: string;
//   id: string;
//   traceId?: string;
//   p95: number;
//   averageResponseTime: number;
//   transactionsPerMinute: number;
//   impact: number;
//   transactionType?: string;
// }

export interface ITransactionGroup {
  name: string;
  sample: Transaction;
  // sample: {
  //   transactionType: string;
  //   serviceName: string;
  //   transactionId: string;
  //   traceId?: string;
  // };
  p95: number;
  averageResponseTime: number;
  transactionsPerMinute: number;
  impact: number;
}
