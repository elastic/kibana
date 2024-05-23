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
import { useDeepEqualSelector } from '../../../../../../common/hooks/use_selector';
import { timelineActions } from '../../../../../store';
import { useValidateSecuritySolutionESQLQuery } from '../../../../../../common/hooks/esql/use_validate_timeline_esql_query';
import { APP_ID } from '../../../../../../../common';
import { useGetStatefulQueryBar } from '../use_get_stateful_query_bar';
import { selectTimelineDateRange, selectTimelineESQLOptions } from '../../../../../store/selectors';
import type { State } from '../../../../../../common/store/types';
import type { ESQLOptions } from '../../../../../store/types';

type QueryValidationResult = ReturnType<typeof useValidateSecuritySolutionESQLQuery>;

interface OnQueryChangeArgs {
  queryValidationResult: QueryValidationResult;
  query: AggregateQuery;
  dateRange: TimeRange;
}

interface OnQuerySubmitArgs {
  queryValidationResult: QueryValidationResult;
  query: AggregateQuery;
  dateRange: TimeRange;
}

type OnQueryChange = (args: OnQueryChangeArgs) => void;

type OnQuerySubmit = ({ queryValidationResult, query, dateRange }: OnQuerySubmitArgs) => void;

export type ESQLTabHeaderProps = {
  onQuerySubmit?: OnQuerySubmit;
  onQueryChange?: OnQueryChange;
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

  const timelineDateRange = useDeepEqualSelector((state: State) =>
    selectTimelineDateRange(state, timelineId)
  );

  const [localQuery, setLocalQuery] = useState<AggregateQuery>(esqlQuery);
  const [localDateRange, setLocalDateRange] = useState<TimeRange>({
    from: timelineDateRange.start,
    to: timelineDateRange.end,
  });

  useEffect(() => {
    setLocalQuery(esqlQuery);
    setLocalDateRange({
      from: timelineDateRange.start,
      to: timelineDateRange.end,
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

  const queryValidationResult = useValidateSecuritySolutionESQLQuery({
    query: localQuery,
  });

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
        queryValidationResult,
        query: payload.query,
        dateRange: payload.dateRange,
      });
    },
    [
      onQuerySubmitProp,
      queryValidationResult,
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
        queryValidationResult,
        query: payload.query,
        dateRange: payload.dateRange,
      });
    },
    [queryValidationResult, onQueryChangeProp]
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
