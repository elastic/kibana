/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Span } from './Span';
import { Transaction } from './Transaction';

export interface WaterfallResponse {
  services: string[];
  hits: Array<Transaction | Span>;
}
