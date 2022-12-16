/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import { getUnallowedValues } from './helpers';
import * as i18n from '../translations';
import type { UnallowedValueCount, UnallowedValueRequestItem } from '../types';

const UNALLOWED_VALUES_API_ROUTE = '/internal/data_quality/unallowed_field_values';

interface UseUnallowedValues {
  unallowedValues: Record<string, UnallowedValueCount[]> | null;
  error: string | null;
  loading: boolean;
}

export const useUnallowedValues = (
  requestItems: UnallowedValueRequestItem[]
): UseUnallowedValues => {
  const [unallowedValues, setUnallowedValues] = useState<Record<
    string,
    UnallowedValueCount[]
  > | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (requestItems.length === 0) {
      return;
    }

    const abortController = new AbortController();

    async function fetchData() {
      try {
        const response = await fetch(UNALLOWED_VALUES_API_ROUTE, {
          body: JSON.stringify(requestItems),
          headers: { 'Content-Type': 'application/json', 'kbn-xsrf': 'xsrf' },
          method: 'POST',
          signal: abortController.signal,
        });

        if (response.ok) {
          const searchResults = await response.json();

          if (!abortController.signal.aborted) {
            const unallowedValuesMap = getUnallowedValues({
              requestItems,
              searchResults,
            });

            setUnallowedValues(unallowedValuesMap);
          }
        } else {
          throw new Error(response.statusText);
        }
      } catch (e) {
        if (!abortController.signal.aborted) {
          setError(i18n.ERROR_LOADING_UNALLOWED_VALUES(e));
        }
      } finally {
        if (!abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [requestItems, setError]);

  return { unallowedValues, error, loading };
};
