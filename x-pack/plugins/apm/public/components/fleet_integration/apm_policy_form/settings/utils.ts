/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PackagePolicyValues } from '../typings';

function mergeNewValue(
  oldValues: PackagePolicyValues,
  key: string,
  value?: any
): PackagePolicyValues {
  return { ...oldValues, [key]: { ...oldValues[key], value } };
}

export function handleFormChange({
  values,
  key,
  value,
  validateForm,
}: {
  values: PackagePolicyValues;
  key: string;
  value?: any;
  validateForm: (values: PackagePolicyValues) => boolean;
}) {
  const newValues = mergeNewValue(values, key, value);
  const isValid = validateForm(newValues);
  return { newValues, isValid };
}
