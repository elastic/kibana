/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo, useState } from 'react';
import type { CriteriaWithPagination } from '@elastic/eui';
import type { SortOrder } from '../../../../../../common/detection_engine/schemas/common';

type TableItem = Record<string, unknown>;

export const useSorting = <T extends TableItem>(defaultField: keyof T, defaultOrder: SortOrder) => {
  const [sortField, setSortField] = useState<keyof T>(defaultField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultOrder);

  const state = useMemo(() => {
    return {
      sort: {
        field: sortField,
        direction: sortOrder,
      },
    };
  }, [sortField, sortOrder]);

  const update = useCallback(
    (criteria: CriteriaWithPagination<T>): void => {
      if (criteria.sort) {
        setSortField(criteria.sort.field);
        setSortOrder(criteria.sort.direction);
      }
    },
    [setSortField, setSortOrder]
  );

  return useMemo(() => ({ state, update }), [state, update]);
};
