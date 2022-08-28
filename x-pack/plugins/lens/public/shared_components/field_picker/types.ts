/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import type { DataType } from '../../types';

export interface FieldOptionValue {
  type: 'field';
  field: string;
  dataType?: DataType;
}

interface FieldValue<T> {
  label: string;
  value: T;
  exists: boolean;
  compatible: number | boolean;
  'data-test-subj'?: string;
  // defined in groups
  options?: Array<FieldValue<T>>;
}

export type FieldOption<T extends FieldOptionValue> = FieldValue<T> & EuiComboBoxOptionOption<T>;
