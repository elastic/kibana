/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { SearchBarProps, StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { TimeRange } from '@kbn/data-plugin/common';
import { useDispatch, useSelector } from 'react-redux';
import { selectTimelineDateRange } from '../../../../../../common/store/inputs/selectors';
import { useDeepEqualSelector } from '../../../../../../common/hooks/use_selector';
import { timelineActions } from '../../../../../store';
import { APP_ID } from '../../../../../../../common';
import { useGetStatefulQueryBar } from '../use_get_stateful_query_bar';
import { selectTimelineESQLOptions } from '../../../../../store/selectors';
import type { State } from '../../../../../../common/store/types';
import type { ESQLOptions } from '../../../../../store/types';

interface ESQLHeaderOnQueryChangeArgs {
  query: AggregateQuery;
  dateRange: TimeRange;
}

interface ESQLHeaderOnQuerySubmitArgs {
  query: AggregateQuery;
  dateRange: TimeRange;
}

export type ESQLHeaderOnQueryChange = (args: ESQLHeaderOnQueryChangeArgs) => void;

export type ESQLHeaderOnQuerySubmit = (args: ESQLHeaderOnQuerySubmitArgs) => void;

export type ESQLTabHeaderProps = {
  onQuerySubmit?: ESQLHeaderOnQuerySubmit;
  onQueryChange?: ESQLHeaderOnQueryChange;
  timelineId: string;
} & Omit<
  StatefulSearchBarProps<AggregateQuery>,
  'onQuerySubmit' | 'onQueryChange' | 'query' | 'appName'
>;

export const ESQLTabHeader = (props: ESQLTabHeaderProps) => {
  const dispatch = useDispatch();

  const {
    onQuerySubmit: onQuerySubmitProp,
    onQueryChange: onQueryChangeProp,
    timelineId,
    ...restProps
  } = props;

  const { query: esqlQuery } = useSelector((state: State) =>
    selectTimelineESQLOptions(state, timelineId)
  );

  const timelineDateRange = useDeepEqualSelector((state: State) => selectTimelineDateRange(state));

  const [localQuery, setLocalQuery] = useState<AggregateQuery>(esqlQuery);
  const [localDateRange, setLocalDateRange] = useState<TimeRange>(() => timelineDateRange);

  useEffect(() => {
    setLocalQuery(esqlQuery);
    setLocalDateRange({
      from: timelineDateRange.from,
      to: timelineDateRange.to,
    });
  }, [esqlQuery, timelineDateRange]);

  const updateESQLOptionsHandler = useCallback(
    (esqlOptions: Partial<ESQLOptions>) => {
      dispatch(
        timelineActions.updateESQLOptions({
          id: timelineId,
          esqlOptions,
        })
      );
    },
    [dispatch, timelineId]
  );

  const { CustomSearchBar } = useGetStatefulQueryBar();

  const onQuerySubmit = useCallback(
    (payload) => {
      updateESQLOptionsHandler({
        query: localQuery,
      });

      dispatch(
        timelineActions.updateRange({
          id: timelineId,
          start: localDateRange.from,
          end: localDateRange.to,
        })
      );

      onQuerySubmitProp?.({
        query: payload.query,
        dateRange: payload.dateRange,
      });
    },
    [
      onQuerySubmitProp,
      updateESQLOptionsHandler,
      dispatch,
      timelineId,
      localDateRange.from,
      localDateRange.to,
      localQuery,
    ]
  );

  const onQueryChange: SearchBarProps<AggregateQuery>['onQueryChange'] = useCallback(
    (payload) => {
      setLocalQuery(payload.query);
      setLocalDateRange(payload.dateRange);
      onQueryChangeProp?.({
        query: payload.query,
        dateRange: payload.dateRange,
      });
    },
    [onQueryChangeProp]
  );

  return (
    <CustomSearchBar
      query={localQuery}
      dateRangeFrom={localDateRange.from}
      dateRangeTo={localDateRange.to}
      useDefaultBehaviors={false}
      appName={APP_ID}
      onQuerySubmit={onQuerySubmit}
      onQueryChange={onQueryChange}
      {...restProps}
    />
  );
};
