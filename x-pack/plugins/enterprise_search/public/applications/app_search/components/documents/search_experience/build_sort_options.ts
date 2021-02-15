/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { flatten } from 'lodash';

import { ASCENDING, DESCENDING } from './constants';
import { Fields, SortOption, SortDirection } from './types';

const fieldNameToSortOptions = (fieldName: string): SortOption[] =>
  ['asc', 'desc'].map((direction) => ({
    name: direction === 'asc' ? ASCENDING(fieldName) : DESCENDING(fieldName),
    value: fieldName,
    direction: direction as SortDirection,
  }));

/**
 * Adds two sort options for a given field, a "desc" and an "asc" option.
 */
export const buildSortOptions = (
  fields: Fields,
  defaultSortOptions: SortOption[]
): SortOption[] => {
  const sortFieldsOptions = flatten(fields.sortFields.map(fieldNameToSortOptions));
  const sortingOptions = [...defaultSortOptions, ...sortFieldsOptions];
  return sortingOptions;
};
