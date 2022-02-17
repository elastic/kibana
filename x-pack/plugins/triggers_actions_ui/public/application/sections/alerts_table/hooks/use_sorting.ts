/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useState } from 'react';

export function useSorting() {
  const [sortingColumns, setSortingColumns] = useState([]);
  const onSort = useCallback(
    (_state) => {
      setSortingColumns(_state);
    },
    [setSortingColumns]
  );
  return { sortingColumns, onSort };
}
