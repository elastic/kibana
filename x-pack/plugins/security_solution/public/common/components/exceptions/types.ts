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

export interface FormattedBuilderEntryBase {
  field: IFieldType | undefined;
  operator: OperatorOption;
  value: string | string[] | undefined;
}

export interface FormattedBuilderEntry extends FormattedBuilderEntryBase {
  parent?: string;
  nested?: FormattedBuilderEntryBase[];
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

export type BuilderEntry = Entry | EmptyListEntry | EmptyEntry | EntryNested;

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
