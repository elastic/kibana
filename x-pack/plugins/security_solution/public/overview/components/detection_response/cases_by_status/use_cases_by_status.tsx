/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect } from 'react';
import { APP_ID } from '../../../../../common/constants';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { useKibana } from '../../../../common/lib/kibana';

export interface CasesCounts {
  count_open_cases?: number;
  count_in_progress_cases?: number;
  count_closed_cases?: number;
}

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
  const { to, from } = useGlobalTime();

  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [casesCounts, setCasesCounts] = useState<CasesCounts | null>(null);

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    const fetchCases = async () => {
      try {
        const casesResponse = await cases.api.cases.getAllCasesMetrics({
          from,
          to,
          owner: APP_ID,
        });
        if (isSubscribed) {
          setCasesCounts(casesResponse);
        }
      } catch (error) {
        if (isSubscribed) {
          setCasesCounts({});
        }
      }
      if (isSubscribed) {
        setIsLoading(false);
        setUpdatedAt(Date.now());
      }
    };

    if (!skip) {
      fetchCases();
    }

    if (skip) {
      setIsLoading(false);
      isSubscribed = false;
      abortCtrl.abort();
    }

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
    };
  }, [cases.api.cases, from, skip, to]);

  return {
    closed: casesCounts?.count_closed_cases ?? 0,
    inProgress: casesCounts?.count_in_progress_cases ?? 0,
    isLoading,
    open: casesCounts?.count_open_cases ?? 0,
    totalCounts:
      (casesCounts?.count_closed_cases ?? 0) +
      (casesCounts?.count_in_progress_cases ?? 0) +
      (casesCounts?.count_open_cases ?? 0),
    updatedAt,
  };
};
