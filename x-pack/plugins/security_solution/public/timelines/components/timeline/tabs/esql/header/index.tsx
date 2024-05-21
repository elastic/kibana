/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import type { SearchBarProps, StatefulSearchBarProps } from '@kbn/unified-search-plugin/public';
import type { AggregateQuery } from '@kbn/es-query';
import type { TimeRange } from '@kbn/data-plugin/common';
import { useValidateSecuritySolutionESQLQuery } from '../../../../../../common/hooks/esql/use_validate_timeline_esql_query';
import { APP_ID } from '../../../../../../../common';
import { useGetStatefulQueryBar } from '../use_get_stateful_query_bar';

type QueryValidationResult = ReturnType<typeof useValidateSecuritySolutionESQLQuery>;

interface OnQueryChangeArgs {
  queryValidationResult: QueryValidationResult;
  query: AggregateQuery;
  dateRange: TimeRange;
}

type OnQueryChange = (args: OnQueryChangeArgs) => void;

type OnQuerySubmit = ({
  queryValidationResult,
}: {
  queryValidationResult: QueryValidationResult;
}) => void;

export type ESQLTabHeaderProps = {
  onQuerySubmit?: OnQuerySubmit;
  onQueryChange?: OnQueryChange;
  query: AggregateQuery;
} & Omit<
  StatefulSearchBarProps<AggregateQuery>,
  'onQuerySubmit' | 'onQueryChange' | 'query' | 'appName'
>;

export const ESQLTabHeader = (props: ESQLTabHeaderProps) => {
  const { CustomSearchBar } = useGetStatefulQueryBar();

  const {
    query,
    onQuerySubmit: onQuerySubmitProp,
    onQueryChange: onQueryChangeProp,
    ...restProps
  } = props;

  const queryValidationResult = useValidateSecuritySolutionESQLQuery({
    query,
  });

  const onQuerySubmit = useCallback(() => {
    onQuerySubmitProp?.({ queryValidationResult });
  }, [onQuerySubmitProp, queryValidationResult]);

  const onQueryChange: SearchBarProps<AggregateQuery>['onQueryChange'] = useCallback(
    (payload) => {
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
      useDefaultBehaviors={false}
      appName={APP_ID}
      query={query}
      onQuerySubmit={onQuerySubmit}
      onQueryChange={onQueryChange}
      {...restProps}
    />
  );
};
