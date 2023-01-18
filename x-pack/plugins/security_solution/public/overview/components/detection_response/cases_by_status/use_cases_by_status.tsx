/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CasesStatus } from '@kbn/cases-plugin/common/ui';
import { useState, useEffect, useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { APP_ID } from '../../../../../common/constants';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';

export interface UseCasesByStatusProps {
  skip?: boolean;
}

export interface UseCasesByStatusResults {
  closed: number;
  inProgress: number;
  isLoading: boolean;
  open: number;
  totalCounts: number;
  updatedAt: number;
}

export const useCasesByStatus = ({ skip = false }) => {
  const {
    services: { cases },
  } = useKibana();
  const { to, from, setQuery, deleteQuery } = useGlobalTime();
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `useCaseItems-${uuid()}`, []);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [casesCounts, setCasesCounts] = useState<CasesStatus | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    const fetchCases = async () => {
      try {
        const casesResponse = await cases.api.cases.getCasesStatus(
          {
            from,
            to,
            owner: APP_ID,
          },
          abortCtrl.signal
        );

        if (isSubscribed) {
          setCasesCounts(casesResponse);
        }
      } catch (error) {
        if (isSubscribed) {
          setCasesCounts(null);
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
    closed: casesCounts?.countClosedCases ?? 0,
    inProgress: casesCounts?.countInProgressCases ?? 0,
    isLoading,
    open: casesCounts?.countOpenCases ?? 0,
    totalCounts:
      (casesCounts?.countClosedCases ?? 0) +
      (casesCounts?.countInProgressCases ?? 0) +
      (casesCounts?.countOpenCases ?? 0),
    updatedAt,
  };
};
