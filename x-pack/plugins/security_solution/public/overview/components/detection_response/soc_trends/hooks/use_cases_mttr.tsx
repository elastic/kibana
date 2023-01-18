/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useReducer } from 'react';
import { v4 as uuid } from 'uuid';
import { statReducer } from './stat_reducer';
import type { GlobalTimeArgs } from '../../../../../common/containers/use_global_time';
import { useKibana } from '../../../../../common/lib/kibana';
import { APP_ID } from '../../../../../../common/constants';
import { getPercChange, makePrettyNumber } from '../helpers';
import * as i18n from '../translations';
import type { StatState } from './use_soc_trends';

export interface UseCasesMttr {
  deleteQuery: GlobalTimeArgs['deleteQuery'];
  from: GlobalTimeArgs['from'];
  fromCompare: string;
  setQuery: GlobalTimeArgs['setQuery'];
  skip?: boolean;
  to: GlobalTimeArgs['to'];
  toCompare: string;
}

export const useCasesMttr = ({
  deleteQuery,
  from,
  fromCompare,
  setQuery,
  skip = false,
  to,
  toCompare,
}: UseCasesMttr): StatState => {
  const {
    services: { cases },
  } = useKibana();
  const uniqueQueryId = useMemo(() => `useCasesMttr-${uuid()}`, []);
  const [state, dispatch] = useReducer(statReducer, {
    description: i18n.CASES_MTTR_DESCRIPTION,
    isLoading: true,
    percentage: {
      percent: null,
      color: 'hollow',
      note: i18n.NO_DATA('case'),
    },
    stat: '-',
    testRef: 'casesMttr',
    title: i18n.CASES_MTTR_STAT,
    updatedAt: Date.now(),
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
              from: fromCompare,
              to: toCompare,
              owner: APP_ID,
              features: ['mttr'],
            },
            abortCtrl.signal
          ),
        ]);

        const percentageChange = getPercChange(responseCurrent.mttr, responseCompare.mttr);

        if (isSubscribed && responseCurrent.mttr != null) {
          dispatch({ type: 'setStat', stat: makePrettyNumber(responseCurrent.mttr) });
        } else if (isSubscribed) {
          dispatch({ type: 'setStat', stat: '-' });
        }

        if (
          responseCurrent.mttr != null &&
          responseCompare.mttr != null &&
          percentageChange != null
        ) {
          const isNegative = percentageChange.charAt(0) === '-';
          const isZero = percentageChange === '0.0%';

          dispatch({
            type: 'setPercentage',
            percentage: {
              percent: isNegative || isZero ? percentageChange : `+${percentageChange}`,
              color: isZero
                ? 'hollow'
                : isNegative
                ? 'success' // a negative change is good
                : 'danger',
              note: isZero
                ? i18n.NO_CHANGE('case resolution time')
                : i18n.STAT_DIFFERENCE({
                    upOrDown: isNegative ? 'down' : 'up',
                    percentageChange: isNegative ? percentageChange.substring(1) : percentageChange,
                    stat: makePrettyNumber(responseCompare.mttr),
                    statType: 'case resolution time',
                  }),
            },
          });
        } else {
          const badCurrent = responseCurrent.mttr == null;
          const badCompare = responseCompare.mttr == null;
          const note =
            badCurrent && badCompare
              ? i18n.NO_DATA('case')
              : badCurrent
              ? i18n.NO_DATA_CURRENT('case')
              : i18n.NO_DATA_COMPARE('case');

          dispatch({
            type: 'setPercentage',
            percentage: {
              percent: null,
              color: 'hollow',
              note,
            },
          });
        }
      } catch (error) {
        if (isSubscribed) {
          dispatch({ type: 'setStat', stat: '-' });
        }
      }
      if (isSubscribed) {
        dispatch({ type: 'setIsLoading', isLoading: false });
        dispatch({ type: 'setUpdatedAt', updatedAt: Date.now() });
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
      dispatch({ type: 'setIsLoading', isLoading: false });
      isSubscribed = false;
      abortCtrl.abort();
    }

    return () => {
      isSubscribed = false;
      abortCtrl.abort();
      if (deleteQuery) {
        deleteQuery({ id: uniqueQueryId });
      }
    };
  }, [
    cases.api.cases,
    from,
    skip,
    to,
    setQuery,
    deleteQuery,
    uniqueQueryId,
    fromCompare,
    toCompare,
  ]);

  return state;
};
