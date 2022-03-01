/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';
import { RuleRegistrySearchRequestSort } from '../../../../../../rule_registry/common';

export function useSorting(onSortChange: (sort: RuleRegistrySearchRequestSort[]) => void) {
  const [sortingColumns, setSortingColumns] = useState([]);
  const onSort = useCallback(
    (_state) => {
      onSortChange(_state);
      setSortingColumns(_state);
    },
    [setSortingColumns, onSortChange]
  );
  return { sortingColumns, onSort };
}
