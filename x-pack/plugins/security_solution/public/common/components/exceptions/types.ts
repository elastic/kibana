/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import { Ecs } from '../../../../common/ecs';
import { CodeSignature } from '../../../../common/ecs/file';
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

export interface FlattenedCodeSignature {
  subject_name: string;
  trusted: string;
}

export type Flattened<T> = {
  [K in keyof T]: T[K] extends infer AliasType
    ? AliasType extends CodeSignature[]
      ? FlattenedCodeSignature[]
      : AliasType extends Array<infer rawType>
      ? rawType
      : AliasType extends object
      ? Flattened<AliasType>
      : AliasType
    : never;
};

export type AlertData = {
  '@timestamp': string;
} & Flattened<Ecs>;

export interface EcsHit {
  _id: string;
  _index: string;
  _source: {
    '@timestamp': string;
  } & Omit<Flattened<Ecs>, '_id' | '_index'>;
}
