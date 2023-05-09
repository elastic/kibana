/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useState } from 'react';

import type { TimelineEventsDetailsItem } from '../../../common/search_strategy';
import { getQueryFromEventDetails } from './helpers';

export interface UseSecurityAssistantQuery {
  getQuery: () => Promise<string>;
  error: string | null;
  loading: boolean;
}

export interface Props {
  data: TimelineEventsDetailsItem[];
}

export const useSecurityAssistantQuery = ({ data }: Props): UseSecurityAssistantQuery => {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const getQuery = useCallback(async () => {
    const abortController = new AbortController();

    try {
      return await getQueryFromEventDetails({ data });
    } catch (e) {
      if (!abortController.signal.aborted) {
        setError(e.message);
      }

      throw new Error(e.message);
    } finally {
      if (!abortController.signal.aborted) {
        setLoading(false);
      }
    }
  }, [data]);

  return { getQuery, error, loading };
};
