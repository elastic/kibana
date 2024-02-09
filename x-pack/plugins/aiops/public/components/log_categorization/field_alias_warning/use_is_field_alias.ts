/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useRef, useCallback } from 'react';

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import type { HttpFetchOptions } from '@kbn/core/public';

import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';

const MAPPINGS_API = '/api/index_management/mapping';

export function useIsFieldAlias() {
  const { http } = useAiopsAppContext();
  const abortController = useRef(new AbortController());

  const isFieldAlias = useCallback(
    async (index: string, field: string, headers?: HttpFetchOptions['headers']) => {
      const resp = await http.get<IndicesGetMappingIndexMappingRecord>(`${MAPPINGS_API}/${index}`, {
        headers,
        version: '1',
      });

      if (resp?.mappings?.properties) {
        const fieldMapping = resp.mappings.properties[field];
        return fieldMapping && fieldMapping.type === 'alias';
      }

      return false;
    },
    [http]
  );

  const cancelRequest = useCallback(() => {
    abortController.current.abort();
    abortController.current = new AbortController();
  }, []);

  return { isFieldAlias, cancelRequest };
}
