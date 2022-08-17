/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';
import uuid from 'uuid';
import { APP_ID } from '../../../../../common/constants';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';

export const useSocTrends = ({ skip = false }) => {
  const {
    services: { cases },
  } = useKibana();
  const { to, from, setQuery, deleteQuery } = useGlobalTime();
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `useSocTrends-${uuid.v4()}`, []);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [casesMttr, setCasesMttr] = useState<number | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    const fetchCases = async () => {
      try {
        const casesResponse = await cases.api.cases.getCasesMetrics(
          {
            from,
            to,
            owner: APP_ID,
            features: ['mttr'],
          },
          abortCtrl.signal
        );

        if (isSubscribed && casesResponse.mttr !== undefined) {
          setCasesMttr(casesResponse.mttr);
        }
      } catch (error) {
        if (isSubscribed) {
          setCasesMttr(null);
        }
      }
      if (isSubscribed) {
        setIsLoading(false);
        setUpdatedAt(Date.now());
      }
    };

    if (!skip) {
      fetchCases();
      setQuery({
        id: uniqueQueryId,
        inspect: null,
        loading: false,
        refetch: fetchCases,
      });
    }

    if (skip) {
      setIsLoading(false);
      isSubscribed = false;
      abortCtrl.abort();
    }

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
      deleteQuery({ id: uniqueQueryId });
    };
  }, [cases.api.cases, from, skip, to, setQuery, deleteQuery, uniqueQueryId]);

  return {
    casesMttr,
    isLoading,
    updatedAt,
  };
};
