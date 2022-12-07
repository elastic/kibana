/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import { enumeration } from '@kbn/securitysolution-io-ts-types';
import { SortingOptions, PaginationOptions } from '../../../../rule_management/logic';

export enum RuleSource {
  Prebuilt = 'prebuilt',
  Custom = 'custom',
}

export type RulesTableSavedFilter = t.TypeOf<typeof RulesTableSavedFilter>;
export const RulesTableSavedFilter = t.partial({
  searchTerm: t.string,
  source: enumeration('RuleSource', RuleSource),
  tags: t.array(t.string),
});

export type RulesTableSavedSorting = t.TypeOf<typeof RulesTableSavedSorting>;
export const RulesTableSavedSorting = t.partial({
  field: SortingOptions.props.field,
  order: SortingOptions.props.order,
});

export type RulesTableStorageSavedPagination = t.TypeOf<typeof RulesTableStorageSavedPagination>;
export const RulesTableStorageSavedPagination = t.partial({
  perPage: PaginationOptions.props.perPage,
});

export type RulesTableUrlSavedPagination = t.TypeOf<typeof RulesTableUrlSavedPagination>;
export const RulesTableUrlSavedPagination = t.partial({
  page: PaginationOptions.props.page,
  perPage: PaginationOptions.props.perPage,
});

export type RulesTableStorageSavedState = RulesTableSavedFilter &
  RulesTableSavedSorting &
  RulesTableStorageSavedPagination;

export type RulesTableUrlSavedState = RulesTableSavedFilter &
  RulesTableSavedSorting &
  RulesTableUrlSavedPagination;
