/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { noop } from 'lodash';
import { useEffect } from 'react';
import type { FactoryQueryTypes, StrategyResponseType } from '../../../common/search_strategy';
import { getInspectResponse } from '../../helpers';
import { useGlobalTime } from '../containers/use_global_time';
import type { Refetch, RefetchKql } from '../store/inputs/model';

/**
 * Add and remove query response from global input store.
 */
export const useInspectQuery = <T extends FactoryQueryTypes>(
  id: string,
  loading: boolean,
  response?: StrategyResponseType<T>,
  refetch: Refetch | RefetchKql = noop
) => {
  const { deleteQuery, setQuery, isInitializing } = useGlobalTime();

  useEffect(() => {
    if (!loading && !isInitializing && response?.inspect) {
      setQuery({
        id,
        inspect: getInspectResponse(response, {
          dsl: [],
          response: [],
        }),
        loading,
        refetch,
      });
    }

    return () => {
      if (deleteQuery) {
        deleteQuery({ id });
      }
    };
  }, [deleteQuery, setQuery, loading, response, isInitializing, id, refetch]);
};
