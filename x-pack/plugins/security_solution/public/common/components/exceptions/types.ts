/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { ReactNode } from 'react';
import { IFieldType } from '../../../../../../../src/plugins/data/common';
import { OperatorOption } from '../autocomplete/types';
import {
  EntryNested,
  Entry,
  EntryMatch,
  EntryMatchAny,
  EntryExists,
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  NamespaceType,
  OperatorTypeEnum,
  OperatorEnum,
} from '../../../lists_plugin_deps';

export interface FormattedEntry {
  fieldName: string;
  operator: string | undefined;
  value: string | string[] | undefined;
  isNested: boolean;
}

export interface DescriptionListItem {
  title: NonNullable<ReactNode>;
  description: NonNullable<ReactNode>;
}

export interface ExceptionListItemIdentifiers {
  id: string;
  namespaceType: NamespaceType;
}

export interface FilterOptions {
  filter: string;
  tags: string[];
}

export interface Filter {
  filter: Partial<FilterOptions>;
  pagination: Partial<ExceptionsPagination>;
  showDetectionsListsOnly: boolean;
  showEndpointListsOnly: boolean;
}

export interface ExceptionsPagination {
  pageIndex: number;
  pageSize: number;
  totalItemCount: number;
  pageSizeOptions: number[];
}

export interface FormattedBuilderEntry {
  field: IFieldType | undefined;
  operator: OperatorOption;
  value: string | string[] | undefined;
  nested: 'parent' | 'child' | undefined;
  entryIndex: number;
  parent: { parent: EntryNested; parentIndex: number } | undefined;
  correspondingKeywordField: IFieldType | undefined;
}

export interface EmptyEntry {
  field: string | undefined;
  operator: OperatorEnum;
  type: OperatorTypeEnum.MATCH | OperatorTypeEnum.MATCH_ANY;
  value: string | string[] | undefined;
}

export interface EmptyListEntry {
  field: string | undefined;
  operator: OperatorEnum;
  type: OperatorTypeEnum.LIST;
  list: { id: string | undefined; type: string | undefined };
}

export interface EmptyNestedEntry {
  field: string | undefined;
  type: OperatorTypeEnum.NESTED;
  entries: Array<EmptyEntry | EntryMatch | EntryMatchAny | EntryExists>;
}

export type BuilderEntry = Entry | EmptyListEntry | EmptyEntry | EntryNested | EmptyNestedEntry;

export type ExceptionListItemBuilderSchema = Omit<ExceptionListItemSchema, 'entries'> & {
  entries: BuilderEntry[];
};

export type CreateExceptionListItemBuilderSchema = Omit<
  CreateExceptionListItemSchema,
  'meta' | 'entries'
> & {
  meta: { temporaryUuid: string };
  entries: BuilderEntry[];
};

export type ExceptionsBuilderExceptionItem =
  | ExceptionListItemBuilderSchema
  | CreateExceptionListItemBuilderSchema;
