/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { RegisterServicesParams } from '../types';
import { createIndexPatternService } from './index_pattern_service';

export function registerServices(params: RegisterServicesParams) {
  return {
    indexPatternService: createIndexPatternService(),
  };
}
