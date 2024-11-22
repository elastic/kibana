/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TreeFetcherParameters } from '../types';

/**
 * A factory for the most basic `TreeFetcherParameters`. Many tests need to provide this even when the values aren't relevant to the test.
 */
export function mockTreeFetcherParameters(): TreeFetcherParameters {
  return {
    databaseDocumentID: '',
    indices: [],
    filters: {},
    agentId: '',
  };
}
