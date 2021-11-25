/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Search as LocalSearch, AllSubstringsIndexStrategy } from 'js-search';
import { useEffect, useRef } from 'react';

import type { IntegrationCardItem } from '../../../../common/types/models';

export const searchIdField = 'id';
export const fieldsToSearch = ['name', 'title', 'description'];

export function useLocalSearch(packageList: IntegrationCardItem[]) {
  const localSearchRef = useRef<LocalSearch>(new LocalSearch(searchIdField));

  useEffect(() => {
    const localSearch = new LocalSearch(searchIdField);
    localSearch.indexStrategy = new AllSubstringsIndexStrategy();
    fieldsToSearch.forEach((field) => localSearch.addIndex(field));
    localSearch.addDocuments(packageList);
    localSearchRef.current = localSearch;
  }, [packageList]);

  return localSearchRef;
}
