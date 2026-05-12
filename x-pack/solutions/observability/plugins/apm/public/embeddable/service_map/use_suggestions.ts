/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { debounce } from 'lodash';
import type { CoreStart } from '@kbn/core/public';

export interface UseSuggestionsResult {
  terms: string[];
  isLoading: boolean;
  onSearchChange: (value: string) => void;
  fetchAllTerms: () => void;
}

interface UseSuggestionsParams {
  core: CoreStart;
  fieldName: string;
  start: string;
  end: string;
  serviceName?: string;
  fetchOnMount?: boolean;
}

export function useSuggestions({
  core,
  fieldName,
  start,
  end,
  serviceName,
  fetchOnMount = false,
}: UseSuggestionsParams): UseSuggestionsResult {
  const [terms, setTerms] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasFetchedRef = useRef(false);
  const debouncedFetchRef = useRef<ReturnType<typeof debounce> | null>(null);

  const fetchSuggestions = useCallback(
    async (fieldValue: string) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      try {
        const response = await core.http.get<{ terms: string[] }>('/internal/apm/suggestions', {
          query: {
            fieldName,
            fieldValue,
            start,
            end,
            ...(serviceName ? { serviceName } : {}),
          },
          signal: abortControllerRef.current.signal,
          version: '2023-10-31',
        });
        setTerms(response.terms);
        setIsLoading(false);
      } catch (error) {
        if (error.name === 'AbortError') {
          setIsLoading(false);
          return;
        }
        console.error('Error fetching suggestions:', error);
        setTerms([]);
        setIsLoading(false);
      }
    },
    [core.http, fieldName, start, end, serviceName]
  );

  const fetchAllTerms = useCallback(() => {
    fetchSuggestions('');
  }, [fetchSuggestions]);

  const debouncedFetch = useMemo(() => {
    debouncedFetchRef.current?.cancel();
    const fn = debounce((value: string) => fetchSuggestions(value), 300);
    debouncedFetchRef.current = fn;
    return fn;
  }, [fetchSuggestions]);

  const prevServiceNameRef = useRef(serviceName);

  useEffect(() => {
    const serviceNameChanged = prevServiceNameRef.current !== serviceName;
    prevServiceNameRef.current = serviceName;

    if (fetchOnMount && (!hasFetchedRef.current || serviceNameChanged)) {
      hasFetchedRef.current = true;
      fetchAllTerms();
    }
  }, [fetchOnMount, fetchAllTerms, serviceName]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      debouncedFetchRef.current?.cancel();
    };
  }, []);

  const onSearchChange = useCallback(
    (value: string) => {
      debouncedFetch(value);
    },
    [debouncedFetch]
  );

  return { terms, isLoading, onSearchChange, fetchAllTerms };
}
