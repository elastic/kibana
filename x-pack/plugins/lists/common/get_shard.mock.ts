/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ShardsResponse } from 'elasticsearch';

export const getShardMock = (): ShardsResponse => ({
  failed: 0,
  skipped: 0,
  successful: 0,
  total: 0,
});
