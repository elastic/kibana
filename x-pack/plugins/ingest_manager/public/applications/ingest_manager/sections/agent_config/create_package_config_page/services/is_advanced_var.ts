/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { RegistryVarsEntry } from '../../../../types';

export const isAdvancedVar = (varDef: RegistryVarsEntry): boolean => {
  if (varDef.show_user || (varDef.required && varDef.default === undefined)) {
    return false;
  }
  return true;
};
