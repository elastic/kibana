/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Hint } from '../models';

import type { ListResult, ListWithKuery } from './common';

export interface GetHintsRequest {
  query: ListWithKuery;
}

export interface GetHintsResponse extends ListResult<Hint> {
  hints?: Hint[];
}
