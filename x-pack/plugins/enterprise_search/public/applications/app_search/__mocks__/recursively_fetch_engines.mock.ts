/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EngineDetails } from '../components/engine/types';

export const mockSourceEngines = [
  { name: 'source-engine-1' },
  { name: 'source-engine-2' },
] as EngineDetails[];

export const mockRecursivelyFetchEngines = jest.fn(({ onComplete }) =>
  onComplete(mockSourceEngines)
);

jest.mock('../utils/recursively_fetch_engines', () => ({
  recursivelyFetchEngines: mockRecursivelyFetchEngines,
}));
