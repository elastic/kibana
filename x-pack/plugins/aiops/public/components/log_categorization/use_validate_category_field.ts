/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback } from 'react';

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { FieldValidationResults } from '@kbn/ml-category-validator';
import { AIOPS_API_ENDPOINT } from '../../../common/api';
import { useAiopsAppContext } from '../../hooks/use_aiops_app_context';
import { createCategorizeQuery } from './use_categorize_request';

export function useValidateFieldRequest() {
  const { http } = useAiopsAppContext();
  const abortController = useRef(new AbortController());

  const runValidateFieldRequest = useCallback(
    async (
      index: string,
      field: string,
      timeField: string,
      start: number | undefined,
      end: number | undefined,
      queryIn: QueryDslQueryContainer
    ) => {
      const query = createCategorizeQuery(queryIn, timeField, start, end);
      const resp = await http.post<FieldValidationResults>(
        AIOPS_API_ENDPOINT.CATEGORIZATION_FIELD_VALIDATION,
        {
          body: JSON.stringify({
            indexPatternTitle: index,
            query,
            size: 5,
            field,
            timeField,
            start,
            end,
            // only text fields are supported in pattern analysis,
            // and it is not possible to create a text runtime field
            // so runtimeMappings are not needed
            runtimeMappings: undefined,
            indicesOptions: undefined,
            includeExamples: false,
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
