/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Search as LocalSearch, PrefixIndexStrategy } from 'js-search';
import { useRef } from 'react';

import type { IntegrationCardItem } from '../../../../common/types/models';

export const searchIdField = 'id';
export const fieldsToSearch = ['name', 'title'];

export function useLocalSearch(packageList: IntegrationCardItem[]) {
  const localSearchRef = useRef<LocalSearch>(new LocalSearch(searchIdField));

  const localSearch = new LocalSearch(searchIdField);
  localSearch.indexStrategy = new PrefixIndexStrategy();
  fieldsToSearch.forEach((field) => localSearch.addIndex(field));
  localSearch.addDocuments(packageList);
  localSearchRef.current = localSearch;

  return localSearchRef;
}
