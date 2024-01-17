/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { lensFunctionDefinition } from '../../common/functions/lens';
import { RegisterFunction } from '../service/types';

export function registerLensFunction({ registerFunction }: { registerFunction: RegisterFunction }) {
  registerFunction(lensFunctionDefinition, async () => {
    return {
      content: {},
    };
  });
}
