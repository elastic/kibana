/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { Search as LocalSearch } from 'js-search';
import { useEffect, useRef } from 'react';
import { PackageList, PackageListItem } from '../../../types';

export type SearchField = keyof PackageListItem;
export const searchIdField: SearchField = 'name';
export const fieldsToSearch: SearchField[] = ['description', 'name', 'title'];

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
