/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiffableRule } from '../../../../../../../common/api/detection_engine';

export interface FieldComponentProps {
  finalDiffableRule: DiffableRule;
  setValidity: SetValidityFn;
  setFieldValue: SetFieldValueFn;
  resetField: ResetFieldFn;
}

type SetValidityFn = (isValid: boolean) => void;

type SetFieldValueFn = (fieldName: string, fieldValue: unknown) => void;

type ResetFieldFn = (
  fieldName: string,
  options?: { resetValue?: boolean; defaultValue?: unknown }
) => void;
