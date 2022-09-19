/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Pagination } from '@elastic/eui';
import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import type { RuleReferenceSchema } from '../../../../../../common/detection_engine/schemas/response';

export interface GetExceptionItemProps {
  pagination?: Pagination;
  search?: string;
  filters?: string;
}

export interface PaginationProps {
  dataTestSubj?: string;
  ariaLabel?: string;
  pagination: Pagination;
  onPaginationChange: (arg: GetExceptionItemProps) => void;
}

export enum ViewerStatus {
  ERROR = 'error',
  EMPTY = 'empty',
  EMPTY_SEARCH = 'empty_search',
  LOADING = 'loading',
  SEARCHING = 'searching',
  DELETING = 'deleting',
}

export type ViewerState =
  | 'error'
  | 'empty'
  | 'empty_search'
  | 'loading'
  | 'searching'
  | 'deleting'
  | null;

export interface ExceptionListSummaryProps {
  pagination: Pagination;
  // Corresponds to last time exception items were fetched
  lastUpdated: string | number | null;
}

export type ViewerFlyoutName = 'addException' | 'editException' | null;

export interface RuleReferences {
  [key: string]: RuleReferenceSchema[];
}
export type ReturnUseFindExceptionListReferences = [boolean, RuleReferences | null];

export type { RuleReferenceSchema };

export interface ExceptionListItemIdentifiers {
  id: string;
  name: string;
  namespaceType: NamespaceType;
}
