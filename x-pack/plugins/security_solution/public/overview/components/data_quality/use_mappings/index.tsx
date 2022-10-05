/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesGetMappingIndexMappingRecord } from '@elastic/elasticsearch/lib/api/types';
import { useEffect, useState } from 'react';

import * as i18n from '../translations';

const API_CONSOLE_ENDPOINT = '/internal/data_quality/mappings';

interface UseMappings {
  indexes: Record<string, IndicesGetMappingIndexMappingRecord> | null;
  error: string | null;
  loading: boolean;
}

export const useMappings = (pattern: string | null): UseMappings => {
  const [indexes, setIndexes] = useState<Record<
    string,
    IndicesGetMappingIndexMappingRecord
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (pattern == null) {
      return;
    }

    async function fetchData() {
      try {
        const encodedIndexName = encodeURIComponent(`${pattern}`);

        const response = await fetch(`${API_CONSOLE_ENDPOINT}/${encodedIndexName}`, {
          method: 'GET',
        });

        if (response.ok) {
          const json = await response.json();

          setIndexes(json);
        } else {
          throw new Error(response.statusText);
        }
      } catch (e) {
        setError(i18n.ERROR_LOADING_MAPPINGS(e));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [pattern, setError]);

  return { indexes, error, loading };
};
