/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo } from 'react';
import * as i18n from './translations';

import { useSearchStrategy } from '../use_search_strategy';
import { FirstLastSeenQuery } from '../../../../common/search_strategy';
import type { Direction } from '../../../../common/search_strategy';

export interface FirstLastSeenArgs {
  errorMessage: string | null;
  firstSeen?: string | null;
  lastSeen?: string | null;
}
export interface UseFirstLastSeen {
  field: string;
  value: string;
  order: Direction.asc | Direction.desc;
  defaultIndex: string[];
}

export const useFirstLastSeen = ({
  field,
  value,
  order,
  defaultIndex,
}: UseFirstLastSeen): [boolean, FirstLastSeenArgs] => {
  const { loading, result, search, error } = useSearchStrategy<typeof FirstLastSeenQuery>({
    factoryQueryType: FirstLastSeenQuery,
    initialResult: {
      firstSeen: null,
      lastSeen: null,
    },
    errorMessage: i18n.FAIL_FIRST_LAST_SEEN_HOST,
  });

  useEffect(() => {
    search({
      defaultIndex,
      factoryQueryType: FirstLastSeenQuery,
      field,
      value,
      order,
    });
  }, [defaultIndex, field, value, order, search]);

  const setFirstLastSeenResponse: FirstLastSeenArgs = useMemo(
    () => ({
      firstSeen: result.firstSeen,
      lastSeen: result.lastSeen,
      errorMessage: error ? (error as Error).toString() : null,
    }),
    [result, error]
  );

  return [loading, setFirstLastSeenResponse];
};
