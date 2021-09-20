/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ReactNode } from 'react';
import type { NamespaceType } from '@kbn/securitysolution-io-ts-list-types';
import type { Ecs } from '../../../../common/ecs';
import type { CodeSignature } from '../../../../common/ecs/file';

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
