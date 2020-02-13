/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { TransactionRaw } from '../raw/TransactionRaw';
import { Agent } from './fields/Agent';

// Make `transaction.name` required instead of optional.
// `transaction.name` can be missing in Elasticsearch but the UI will only aggregate on transactions with a name,
// and thus it doesn't make sense to treat it as optional
type InnerTransaction = TransactionRaw['transaction'];
interface InnerTransactionWithName extends InnerTransaction {
  name: string;
}

export interface Transaction extends TransactionRaw {
  agent: Agent;
  transaction: InnerTransactionWithName;
}
