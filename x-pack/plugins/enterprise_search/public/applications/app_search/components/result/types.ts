/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonIconProps } from '@elastic/eui';

import { InternalSchemaType, SchemaType } from '../../../shared/schema/types';

export type FieldType = InternalSchemaType | SchemaType;

export type NestedFieldValue =
  | { [fieldName: string]: SimpleFieldValue | NestedFieldValue }
  | NestedFieldValue[];
export type SimpleFieldValue = string | string[] | number | number[];
export type Raw = SimpleFieldValue | NestedFieldValue;
export type Snippet = string;
export interface FieldValue {
  raw?: Raw;
  snippet?: Snippet;
}

export interface ResultMeta {
  id: string;
  score?: number;
  engine: string;
  clicks?: number;
}

export interface ResultAction {
  onClick(): void;
  title: string;
  iconType: string;
  iconColor?: EuiButtonIconProps['color'];
  disabled?: boolean;
}
