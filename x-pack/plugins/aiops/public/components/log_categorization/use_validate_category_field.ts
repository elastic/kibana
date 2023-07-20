/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback } from 'react';

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { FieldValidationResults } from '@kbn/ml-category-validator';
import { API_ENDPOINT } from '../../../common/api';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';

export function useValidateFieldRequest() {
  const { http } = useAiopsAppContext();
  const abortController = useRef(new AbortController());

  const runValidateFieldRequest = useCallback(
    async (
      index: string,
      field: string,
      timeField: string,
      from: number | undefined,
      to: number | undefined,
      query: QueryDslQueryContainer
    ) => {
      const resp = await http.post<FieldValidationResults>(
        API_ENDPOINT.CATEGORIZATION_FIELD_EXAMPLES,
        {
          body: JSON.stringify({
            indexPatternTitle: index,
            query,
            size: 5,
            field,
            timeField,
            start: from,
            end: to,
            runtimeMappings: {},
            indicesOptions: undefined,
          }),
          version: '1',
        }
      );

      return resp;
    },
    [http]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { runValidateFieldRequest, cancelRequest };
}
