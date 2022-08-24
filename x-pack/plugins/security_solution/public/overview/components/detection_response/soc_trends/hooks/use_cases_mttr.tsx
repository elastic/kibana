/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useReducer } from 'react';
import prettyMilliseconds from 'pretty-ms';
import uuid from 'uuid';
import type { GlobalTimeArgs } from '../../../../../common/containers/use_global_time';
import { useKibana } from '../../../../../common/lib/kibana';
import { APP_ID } from '../../../../../../common/constants';
import { getPercChange } from '../helpers';
import * as i18n from '../translations';

export interface CasesMttrState {
  casesMttr: string;
  isLoading: boolean;
  percentage: { percent: string | null; color: 'success' | 'danger' | 'hollow'; note: string };
  updatedAt: number;
}

type CasesMttrActions =
  | {
      type: 'setUpdatedAt';
      updatedAt: CasesMttrState['updatedAt'];
    }
  | {
      type: 'setIsLoading';
      isLoading: CasesMttrState['isLoading'];
    }
  | {
      type: 'setCasesMttr';
      casesMttr: CasesMttrState['casesMttr'];
    }
  | {
      type: 'setPercentage';
      percentage: CasesMttrState['percentage'];
    };

const reducer = (state: CasesMttrState, action: CasesMttrActions) => {
  switch (action.type) {
    case 'setIsLoading':
      return { ...state, isLoading: action.isLoading };
    case 'setUpdatedAt':
      return { ...state, updatedAt: action.updatedAt };
    case 'setCasesMttr':
      return { ...state, casesMttr: action.casesMttr };
    case 'setPercentage':
      return { ...state, percentage: action.percentage };
    default:
      throw new Error();
  }
};

const makePrettyNumber = (mttr: number): string =>
  prettyMilliseconds(mttr * 1000, { compact: true, verbose: false });

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
}: UseCasesMttr): CasesMttrState => {
  const {
    services: { cases },
  } = useKibana();
  const uniqueQueryId = useMemo(() => `useCasesMttr-${uuid.v4()}`, []);
  const [state, dispatch] = useReducer(reducer, {
    updatedAt: Date.now(),
    isLoading: true,
    casesMttr: '-',
    percentage: {
      percent: null,
      color: 'hollow',
      note: i18n.NO_CASE_DATA,
    },
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
          dispatch({ type: 'setCasesMttr', casesMttr: makePrettyNumber(responseCurrent.mttr) });
        } else if (isSubscribed) {
          dispatch({ type: 'setCasesMttr', casesMttr: '-' });
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
              percent: percentageChange,
              color: isZero
                ? 'hollow'
                : isNegative
                ? 'success' // a negative change is good
                : 'danger',
              note: isZero
                ? i18n.NO_TIME_CHANGE
                : i18n.TIME_DIFFERENCE({
                    upOrDown: isNegative ? 'down' : 'up',
                    percentageChange: isNegative ? percentageChange.substring(1) : percentageChange,
                    time: makePrettyNumber(responseCompare.mttr),
                  }),
            },
          });
        } else {
          const badCurrent = responseCurrent.mttr == null;
          const badCompare = responseCompare.mttr == null;
          const note =
            badCurrent && badCompare
              ? i18n.NO_CASE_DATA
              : badCurrent
              ? i18n.NO_CASE_DATA_CURRENT
              : i18n.NO_CASE_DATA_COMPARE;

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
          dispatch({ type: 'setCasesMttr', casesMttr: '-' });
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
