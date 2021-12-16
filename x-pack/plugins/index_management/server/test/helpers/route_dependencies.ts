/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { handleEsError } from '../../shared_imports';
import { IndexDataEnricher } from '../../services';
import type { RouteDependencies } from '../../types';

export const routeDependencies: Omit<RouteDependencies, 'router'> = {
  config: {
    isSecurityEnabled: jest.fn().mockReturnValue(true),
  },
  indexDataEnricher: new IndexDataEnricher(),
  lib: {
    handleEsError,
  },
};
