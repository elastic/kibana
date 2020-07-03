/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { useState } from 'react';
import { CriteriaWithPagination } from '@elastic/eui/src/components/basic_table/basic_table';

export function useSorting<T>(defaultSorting: CriteriaWithPagination<T>['sort']) {
  const [sorting, setSorting] = useState<CriteriaWithPagination<T>['sort']>(defaultSorting);

  return {
    sorting,
    setSorting,
  };
}
