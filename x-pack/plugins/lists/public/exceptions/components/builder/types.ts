/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IFieldType } from '../../../../../../../src/plugins/data/common';
import { OperatorOption } from '../autocomplete/types';
import {
  CreateExceptionListItemSchema,
  Entry,
  EntryExists,
  EntryMatch,
  EntryMatchAny,
  EntryMatchWildcard,
  EntryNested,
  ExceptionListItemSchema,
  OperatorEnum,
  OperatorTypeEnum,
} from '../../../../common';

export interface FormattedBuilderEntry {
  id: string;
  field: IFieldType | undefined;
  operator: OperatorOption;
  value: string | string[] | undefined;
  nested: 'parent' | 'child' | undefined;
  entryIndex: number;
  parent: { parent: BuilderEntryNested; parentIndex: number } | undefined;
  correspondingKeywordField: IFieldType | undefined;
}

export interface EmptyEntry {
  id: string;
  field: string | undefined;
  operator: OperatorEnum;
  type: OperatorTypeEnum.MATCH | OperatorTypeEnum.MATCH_ANY | OperatorTypeEnum.WILDCARD;
  value: string | string[] | undefined;
}

export interface EmptyListEntry {
  id: string;
  field: string | undefined;
  operator: OperatorEnum;
  type: OperatorTypeEnum.LIST;
  list: { id: string | undefined; type: string | undefined };
}

export interface EmptyNestedEntry {
  id: string;
  field: string | undefined;
  type: OperatorTypeEnum.NESTED;
  entries: Array<
    | (EntryMatch & { id?: string })
    | (EntryMatchAny & { id?: string })
    | (EntryMatchWildcard & { id?: string })
    | (EntryExists & { id?: string })
  >;
}

export type BuilderEntry =
  | (Entry & { id?: string })
  | EmptyListEntry
  | EmptyEntry
  | BuilderEntryNested
  | EmptyNestedEntry;

export type BuilderEntryNested = Omit<EntryNested, 'entries'> & {
  id?: string;
  entries: Array<
    | (EntryMatch & { id?: string })
    | (EntryMatchAny & { id?: string })
    | (EntryMatchWildcard & { id?: string })
    | (EntryExists & { id?: string })
  >;
};

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
