/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState, useEffect, useMemo } from 'react';
import uuid from 'uuid';
import { pick } from 'lodash/fp';
import prettyMilliseconds from 'pretty-ms';
import { getPercChange } from './helpers';
import { useDeepEqualSelector } from '../../../../common/hooks/use_selector';
import { inputsSelectors } from '../../../../common/store';
import { useKibana } from '../../../../common/lib/kibana';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import { APP_ID } from '../../../../../common/constants';

interface UseSocTrends {
  casesMttr: string;
  isLoading: boolean;
  percentage: { percent: string | null; color: 'success' | 'danger' | 'hollow'; note: string };
  updatedAt: number;
}

const makePrettyNumber = (mttr: number): string =>
  prettyMilliseconds(mttr * 1000, { compact: true, verbose: false });

export const useSocTrends = ({ skip = false }): UseSocTrends => {
  const {
    services: { cases },
  } = useKibana();
  const { to, from, setQuery, deleteQuery } = useGlobalTime();
  const { from: fromSoc, to: toSoc } = useDeepEqualSelector((state) =>
    pick(['from', 'to'], inputsSelectors.socTrendsTimeRangeSelector(state))
  );
  // create a unique, but stable (across re-renders) query id
  const uniqueQueryId = useMemo(() => `useSocTrends-${uuid.v4()}`, []);
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);
  const [casesMttr, setCasesMttr] = useState<UseSocTrends['casesMttr']>('-');
  const [percentage, setPercentage] = useState<UseSocTrends['percentage']>({
    percent: null,
    color: 'hollow',
    note: 'There is no case data to compare',
  });

  useEffect(() => {
    let isSubscribed = true;
    const abortCtrl = new AbortController();
    const fetchCases = async () => {
      try {
        const [responseCurrent, responseCompare] = await Promise.all([
          cases.api.cases.getCasesMetrics(
            {
              from,
              to,
              owner: APP_ID,
              features: ['mttr'],
            },
            abortCtrl.signal
          ),

          cases.api.cases.getCasesMetrics(
            {
              from: fromSoc,
              to: toSoc,
              owner: APP_ID,
              features: ['mttr'],
            },
            abortCtrl.signal
          ),
        ]);

        const percentageChange = getPercChange(responseCurrent.mttr, responseCompare.mttr);

        if (isSubscribed && responseCurrent.mttr != null) {
          setCasesMttr(makePrettyNumber(responseCurrent.mttr));
        } else if (isSubscribed) {
          setCasesMttr('-');
        }

        if (
          responseCurrent.mttr != null &&
          responseCompare.mttr != null &&
          percentageChange != null
        ) {
          const isNegative = percentageChange.charAt(0) === '-';
          const isZero = percentageChange === '0.0%';
          setPercentage({
            percent: percentageChange,
            color: isZero
              ? 'hollow'
              : isNegative
              ? 'success' // a negative change is good
              : 'danger',
            note: isZero
              ? 'Your case resolution time is unchanged'
              : `Your case resolution time is ${isNegative ? 'down' : 'up'} by ${
                  isNegative ? percentageChange.substring(1) : percentageChange
                } from ${makePrettyNumber(responseCompare.mttr)}`,
          });
        } else {
          const badCurrent = responseCurrent.mttr == null;
          const badCompare = responseCompare.mttr == null;
          const note =
            badCurrent && badCompare
              ? 'There is no case data to compare'
              : badCurrent
              ? 'There is no case data to compare from the current time range'
              : 'There is no case data to compare from the compare time range';
          setPercentage({
            percent: null,
            color: 'hollow',
            note,
          });
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
  }, [cases.api.cases, from, skip, to, setQuery, deleteQuery, uniqueQueryId, fromSoc, toSoc]);

  return {
    casesMttr,
    isLoading,
    percentage,
    updatedAt,
  };
};
