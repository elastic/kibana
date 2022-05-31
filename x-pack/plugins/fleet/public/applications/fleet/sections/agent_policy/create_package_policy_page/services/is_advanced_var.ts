/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RegistryVarsEntry } from '../../../../types';

export const isAdvancedVar = (varDef: RegistryVarsEntry): boolean => {
  if (varDef.show_user || (varDef.required && varDef.default === undefined)) {
    return false;
  }
  return true;
};
