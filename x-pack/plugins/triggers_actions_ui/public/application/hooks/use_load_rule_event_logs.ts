/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import datemath from '@kbn/datemath';
import { useKibana } from '../../common/lib/kibana';
import {
  loadExecutionLogAggregations,
  loadGlobalExecutionLogAggregations,
  LoadExecutionLogAggregationsProps,
  LoadGlobalExecutionLogAggregationsProps,
} from '../lib/rule_api/load_execution_log_aggregations';

const getParsedDate = (date: string) => {
  if (date.includes('now')) {
    return datemath.parse(date)?.format() || date;
  }
  return date;
};

interface CommonProps {
  onError?: (err: any) => void;
}

type LoadExecutionLogProps = LoadExecutionLogAggregationsProps & CommonProps;
type LoadGlobalExecutionLogProps = LoadGlobalExecutionLogAggregationsProps & CommonProps;

export type UseLoadRuleEventLogsProps = LoadExecutionLogProps | LoadGlobalExecutionLogProps;

const isGlobal = (props: UseLoadRuleEventLogsProps): props is LoadGlobalExecutionLogProps => {
  return (props as LoadExecutionLogAggregationsProps).id === '*';
};

export function useLoadRuleEventLogs(props: UseLoadRuleEventLogsProps) {
  const { http } = useKibana().services;
  const queryFn = useCallback(() => {
    if (isGlobal(props)) {
      return loadGlobalExecutionLogAggregations({
        http,
        ...props,
        dateStart: getParsedDate(props.dateStart),
        ...(props.dateEnd ? { dateEnd: getParsedDate(props.dateEnd) } : {}),
      });
    }
    return loadExecutionLogAggregations({
      http,
      ...props,
      dateStart: getParsedDate(props.dateStart),
      ...(props.dateEnd ? { dateEnd: getParsedDate(props.dateEnd) } : {}),
    });
  }, [props, http]);

  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['loadRuleEventLog', props],
    queryFn,
    onError: props.onError,
    retry: 0,
    refetchOnWindowFocus: false,
  });
  const hasExceedLogs = useMemo(() => error && error.body.statusCode === 413, [error]);
  return useMemo(
    () => ({
      data,
      hasExceedLogs,
      isLoading: isLoading || isFetching,
      loadEventLogs: refetch,
    }),
    [data, hasExceedLogs, isFetching, isLoading, refetch]
  );
}
