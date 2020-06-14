/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ReactNode } from 'react';

import { Operator, OperatorType } from '../../../lists_plugin_deps';

export interface OperatorOption {
  message: string;
  value: string;
  operator: Operator;
  type: OperatorType;
}

export interface FormattedEntry {
  fieldName: string;
  operator: string | null;
  value: string | string[] | null;
  isNested: boolean;
}

export interface DescriptionListItem {
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}

export interface Comment {
  created_by: string;
  created_at: string;
  comment: string;
}

export enum ExceptionListType {
  DETECTION_ENGINE = 'detection',
  ENDPOINT = 'endpoint',
}

export interface FilterOptions {
  filter: string;
  showDetectionsList: boolean;
  showEndpointList: boolean;
  tags: string[];
}

export interface Filter {
  filter: Partial<FilterOptions>;
  pagination: Partial<ExceptionsPagination>;
}

export interface ExceptionsPagination {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  pageSizeOptions: number[];
}
