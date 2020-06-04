/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ReactNode } from 'react';

import { NamespaceType } from '../../../lists_plugin_deps';

export interface OperatorOption {
  message: string;
  value: string;
  operator: Operator;
  type: OperatorType;
}

export enum Operator {
  INCLUSION = 'included',
  EXCLUSION = 'excluded',
}

export enum OperatorType {
  NESTED = 'nested',
  PHRASE = 'match',
  PHRASES = 'match_any',
  EXISTS = 'exists',
  LIST = 'list',
}

export interface FormattedEntry {
  fieldName: string;
  operator: string | null;
  value: string | null;
  isNested: boolean;
}

export interface NestedExceptionEntry {
  field: string;
  type: string;
  entries: ExceptionEntry[];
}

export interface ExceptionEntry {
  field: string;
  type: string;
  operator: Operator;
  value: string;
}

export interface DescriptionListItem {
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}

export interface Comment {
  user: string;
  timestamp: string;
  comment: string;
}

export enum ToggleId {
  DETECTION_ENGINE = 'detection',
  ENDPOINT = 'endpoint',
}

export interface RuleExceptionList {
  id: string | null;
  type: string | null;
  namespaceType: NamespaceType | null;
}

export interface FilterOptions {
  filter: string;
  tags: string[];
}

export interface ApiProps {
  id: string | null;
  namespaceType: NamespaceType | null;
}

// TODO: Delete once types are updated
export interface ExceptionListItemSchema {
  _tags: string[];
  comments: Comment[];
  created_at: string;
  created_by: string;
  description?: string;
  entries: Array<ExceptionEntry | NestedExceptionEntry>;
  id: string;
  item_id: string;
  list_id: string;
  meta?: unknown;
  name: string;
  namespace_type: 'single' | 'agnostic';
  tags: string[];
  tie_breaker_id: string;
  type: string;
  updated_at: string;
  updated_by: string;
}
