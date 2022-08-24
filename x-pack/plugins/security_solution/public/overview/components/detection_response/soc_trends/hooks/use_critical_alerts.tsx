/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useReducer } from 'react';
import { useQueryAlerts } from '../../../../../detections/containers/detection_engine/alerts/use_query';
import type { AlertsByStatusAgg } from '../../alerts_by_status/types';
import type { GlobalTimeArgs } from '../../../../../common/containers/use_global_time';
import * as i18n from '../translations';
import { getPercChange } from '../helpers';
import type { StatState } from './use_soc_trends';

type CriticalAlertsActions =
  | {
      type: 'setUpdatedAt';
      updatedAt: StatState['updatedAt'];
    }
  | {
      type: 'setIsLoading';
      isLoading: StatState['isLoading'];
    }
  | {
      type: 'setStat';
      stat: StatState['stat'];
    }
  | {
      type: 'setPercentage';
      percentage: StatState['percentage'];
    };

const reducer = (state: StatState, action: CriticalAlertsActions) => {
  switch (action.type) {
    case 'setIsLoading':
      return { ...state, isLoading: action.isLoading };
    case 'setUpdatedAt':
      return { ...state, updatedAt: action.updatedAt };
    case 'setStat':
      return { ...state, stat: action.stat };
    case 'setPercentage':
      return { ...state, percentage: action.percentage };
    default:
      throw new Error();
  }
};

export interface UseCriticalAlerts {
  deleteQuery: GlobalTimeArgs['deleteQuery'];
  from: GlobalTimeArgs['from'];
  fromCompare: string;
  setQuery: GlobalTimeArgs['setQuery'];
  skip?: boolean;
  signalIndexName: string | null;
  to: GlobalTimeArgs['to'];
  toCompare: string;
}

const getCriticalAlertsQuery = ({ from, to }: { from: string; to: string }) => ({
  size: 0,
  query: {
    bool: {
      must: [
        { match: { 'kibana.alert.workflow_status': 'open' } },
        { match: { 'kibana.alert.severity': 'critical' } },
      ],
      filter: [{ range: { '@timestamp': { gte: from, lte: to } } }],
    },
  },
});

export const useCriticalAlerts = ({
  from,
  fromCompare,
  skip = false,
  signalIndexName,
  to,
  toCompare,
}: UseCriticalAlerts): StatState => {
  const [state, dispatch] = useReducer(reducer, {
    description: i18n.CRITICAL_ALERTS_DESCRIPTION,
    isLoading: true,
    percentage: {
      percent: null,
      color: 'hollow',
      note: i18n.NO_DATA('alerts'),
    },
    stat: '-',
    testRef: 'criticalAlerts',
    title: i18n.CRITICAL_ALERTS_STAT,
    updatedAt: Date.now(),
  });
  const currentTimeQuery = useMemo(
    () =>
      getCriticalAlertsQuery({
        from,
        to,
      }),
    [from, to]
  );

  const compareTimeQuery = useMemo(
    () =>
      getCriticalAlertsQuery({
        from: fromCompare,
        to: toCompare,
      }),
    [fromCompare, toCompare]
  );
  const {
    data: dataCurrent,
    loading: isLoadingCurrent,
    setQuery: setAlertsQueryCurrent,
  } = useQueryAlerts<{}, AlertsByStatusAgg>({
    query: currentTimeQuery,
    indexName: signalIndexName,
    skip,
  });

  const {
    data: dataCompare,
    loading: isLoadingCompare,
    setQuery: setAlertsQueryCompare,
  } = useQueryAlerts<{}, AlertsByStatusAgg>({
    query: compareTimeQuery,
    indexName: signalIndexName,
    skip,
  });

  useEffect(() => {
    setAlertsQueryCurrent(currentTimeQuery);
  }, [currentTimeQuery, setAlertsQueryCurrent]);
  useEffect(() => {
    setAlertsQueryCompare(compareTimeQuery);
  }, [compareTimeQuery, setAlertsQueryCompare]);
  useEffect(() => {
    dispatch({
      type: 'setIsLoading',
      isLoading: isLoadingCurrent || isLoadingCompare,
    });
  }, [isLoadingCurrent, isLoadingCompare]);

  useEffect(() => {
    const current = dataCurrent ? dataCurrent.hits.total.value : null;
    const compare = dataCompare ? dataCompare.hits.total.value : null;
    console.log('STATS', { current, compare });
    const percentageChange = getPercChange(current, compare);
    if (current != null) {
      dispatch({
        type: 'setStat',
        stat: `${current}`,
      });
    } else {
      dispatch({ type: 'setStat', stat: '-' });
    }
    if (
      current != null &&
      compare != null &&
      current !== 0 &&
      compare !== 0 &&
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
            ? i18n.NO_CHANGE('open critical alert count')
            : i18n.STAT_DIFFERENCE({
                upOrDown: isNegative ? 'down' : 'up',
                percentageChange: isNegative ? percentageChange.substring(1) : percentageChange,
                stat: `${compare}`,
                statType: 'open critical alert count',
              }),
        },
      });
    } else {
      const badCurrent = current == null || current === 0;
      const badCompare = compare == null || compare === 0;
      const note =
        badCurrent && badCompare
          ? i18n.NO_DATA('alerts')
          : badCurrent
          ? i18n.NO_DATA_CURRENT('alerts')
          : i18n.NO_DATA_COMPARE('alerts');

      dispatch({
        type: 'setPercentage',
        percentage: {
          percent: null,
          color: 'hollow',
          note,
        },
      });
    }
    dispatch({ type: 'setUpdatedAt', updatedAt: Date.now() });
  }, [dataCurrent, dataCompare]);

  return state;
};
