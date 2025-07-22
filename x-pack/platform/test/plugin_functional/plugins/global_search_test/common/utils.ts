/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { GlobalSearchProviderResult } from '@kbn/global-search-plugin/common/types';

export const createResult = (
  parts: Partial<GlobalSearchProviderResult>
): GlobalSearchProviderResult => ({
  id: 'test',
  title: 'test result',
  type: 'test_type',
  url: '/some-url',
  score: 100,
  ...parts,
});
