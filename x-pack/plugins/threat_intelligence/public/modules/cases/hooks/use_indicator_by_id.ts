/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Indicator } from '../../../../common/types/indicator';
import { useKibana } from '../../../hooks/use_kibana';
import { createFetchIndicatorById, FetchParams } from '../services/fetch_indicator_by_id';

const QUERY_ID = 'indicatorById';

export interface UseIndicatorByIdValue {
  indicator: Indicator | undefined;
  isLoading: boolean;
}

/**
 * Retrieve document from ES by id
 * @param indicatorId id of the indicator saved within the cases attachment
 * @return an object with the indicator and the loading status
 */
export const useIndicatorById = (indicatorId: string): UseIndicatorByIdValue => {
  const {
    services: {
      data: { search: searchService },
    },
  } = useKibana();

  const fetchIndicatorById = useMemo(
    () => createFetchIndicatorById({ searchService }),
    [searchService]
  );

  const { isLoading, data: indicator } = useQuery(
    [
      QUERY_ID,
      {
        indicatorId,
      },
    ],
    ({ signal, queryKey: [_key, queryParams] }) =>
      fetchIndicatorById(queryParams as FetchParams, signal)
  );

  return { indicator, isLoading };
};
