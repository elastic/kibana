/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as z from 'zod';
import { RuleExecutionStatus } from '../../../../../../common/api/detection_engine';
import { PaginationOptions, SortingOptions } from '../../../../rule_management/logic';

export enum RuleSource {
  Prebuilt = 'prebuilt',
  Custom = 'custom',
}

export const RulesTableSavedFilter = z
  .object({
    searchTerm: z.string(),
    source: z.nativeEnum(RuleSource),
    tags: z.array(z.string()),
    enabled: z.boolean(),
    ruleExecutionStatus: RuleExecutionStatus,
  })
  .partial();

export type RulesTableSavedFilter = z.infer<typeof RulesTableSavedFilter>;

export const RulesTableSavedSorting = SortingOptions.pick({
  field: true,
  order: true,
}).partial();

export type RulesTableSavedSorting = z.infer<typeof RulesTableSavedSorting>;

export const RulesTableStorageSavedPagination = PaginationOptions.pick({
  perPage: true,
}).partial();

export type RulesTableStorageSavedPagination = z.infer<typeof RulesTableStorageSavedPagination>;

export type RulesTableUrlSavedPagination = z.infer<typeof RulesTableUrlSavedPagination>;
export const RulesTableUrlSavedPagination = PaginationOptions.pick({
  page: true,
  perPage: true,
}).partial();

export type RulesTableStorageSavedState = RulesTableSavedFilter &
  RulesTableSavedSorting &
  RulesTableStorageSavedPagination;

export type RulesTableUrlSavedState = RulesTableSavedFilter &
  RulesTableSavedSorting &
  RulesTableUrlSavedPagination;
