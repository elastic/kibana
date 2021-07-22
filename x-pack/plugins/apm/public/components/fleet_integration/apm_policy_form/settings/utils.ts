/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicyVars } from '../typings';

function mergeNewVars(
  oldVars: PackagePolicyVars,
  key: string,
  value?: any
): PackagePolicyVars {
  return { ...oldVars, [key]: { ...oldVars[key], value } };
}

export function handleFormChange({
  vars,
  key,
  value,
  validateForm,
}: {
  vars: PackagePolicyVars;
  key: string;
  value?: any;
  validateForm: (vars: PackagePolicyVars) => boolean;
}) {
  const newVars = mergeNewVars(vars, key, value);
  const isValid = validateForm(newVars);
  return { newVars, isValid };
}
