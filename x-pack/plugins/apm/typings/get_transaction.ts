/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Transaction } from 'x-pack/plugins/apm/typings/es_schemas/Transaction';

export type TransactionAPIResponse = Transaction | undefined;

export interface TransactionWithErrorCount {
  transaction: TransactionAPIResponse;
  errorCount: number;
}
