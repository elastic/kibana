/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ColumnDefinition } from './table_type_configs';

interface BaseAssignmentOptions {
  title: string;
  type: 'list' | 'search' | 'primary';
  actionHandler(action: string, payload?: any): void;
}

export interface AssignmentOptionList extends BaseAssignmentOptions {
  items: any[];
  renderAssignmentOptions(item: any, key: string): any;
}

export interface AssignmentOptionSearch extends BaseAssignmentOptions {
  columnDefinitions: ColumnDefinition[];
  searchBox: { placeholder: string; incremental: boolean };
  searchResults?: any[];
  searchFailureMessage?: string;
}

export interface AssignmentPrimaryOptions extends BaseAssignmentOptions {
  opt?: any;
}

export function isListOptions(options: any): options is AssignmentOptionList {
  return options.type === 'list';
}

export function isSearchOptions(options: any): options is AssignmentOptionSearch {
  return options.type === 'search';
}

export function isPrimaryOptions(options: any): options is AssignmentPrimaryOptions {
  return options.type === 'primary';
}
