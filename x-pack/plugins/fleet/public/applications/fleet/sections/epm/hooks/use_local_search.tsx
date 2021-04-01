/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Search as LocalSearch } from 'js-search';
import { useEffect, useRef } from 'react';

import type { PackageList } from '../../../types';

export const searchIdField = 'id';
export const fieldsToSearch = ['description', 'name', 'title'];

export function useLocalSearch(packageList: PackageList) {
  const localSearchRef = useRef<LocalSearch | null>(null);

  useEffect(() => {
    const localSearch = new LocalSearch(searchIdField);
    fieldsToSearch.forEach((field) => localSearch.addIndex(field));
    localSearch.addDocuments(packageList);
    localSearchRef.current = localSearch;
  }, [packageList]);

  return localSearchRef;
}
