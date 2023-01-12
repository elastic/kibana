/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';
import type { ESSearchResponse } from '@kbn/es-types';
import { IInspectorInfo } from '@kbn/data-plugin/common';
import { useInspectorContext } from '@kbn/observability-plugin/public';
import { useDispatch, useSelector } from 'react-redux';
import { useEffect, useMemo } from 'react';
import {
  executeEsQueryAction,
  selectEsQueryLoading,
  selectEsQueryResult,
} from '../state/elasticsearch';

export const useReduxEsSearch = <
  DocumentSource extends unknown,
  TParams extends estypes.SearchRequest
>(
  params: TParams,
  fnDeps: any[],
  options: { inspector?: IInspectorInfo; name: string }
) => {
  const { name } = options ?? {};

  const { addInspectorRequest } = useInspectorContext();

  const dispatch = useDispatch();

  const loadings = useSelector(selectEsQueryLoading);
  const results = useSelector(selectEsQueryResult);

  useEffect(() => {
    if (params.index) {
      dispatch(executeEsQueryAction.get({ params, name, addInspectorRequest }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addInspectorRequest, dispatch, name, JSON.stringify(params)]);

  return useMemo(() => {
    return {
      data: results[name] as ESSearchResponse<DocumentSource, TParams>,
      loading: loadings[name],
    };
  }, [loadings, name, results]);
};

export function createEsParams<T extends estypes.SearchRequest>(params: T): T {
  return params;
}
