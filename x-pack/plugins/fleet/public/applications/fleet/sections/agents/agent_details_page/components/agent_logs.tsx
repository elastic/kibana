/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { memo, useMemo, useState, useEffect } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { Moment } from 'moment';
import { LogStream } from '../../../../../../../../infra/public';
import {
  SearchBar,
  TimeHistory,
  Query,
  IIndexPattern,
  IFieldType,
} from '../../../../../../../../../../src/plugins/data/public';
import { Agent } from '../../../../types';
import { useStartServices } from '../../../../hooks';

export const AgentLogs: React.FunctionComponent<{ agent: Agent }> = memo(({ agent }) => {
  const { storage, data } = useStartServices();
  const fixedQuery = useMemo(() => `event.dataset:elastic_agent and elastic_agent.id:${agent.id}`, [
    agent.id,
  ]);

  // Search bar states
  const [isSearchBarLoading, setIsSearchBarLoading] = useState<boolean>(true);
  const [indexPattern, setIndexPattern] = useState<IIndexPattern>({
    title: 'logs-elastic_agent-*',
    fields: [],
  });

  // Initial time range filter
  const [dateRange, setDateRange] = useState<{ min?: Moment; max?: Moment }>(
    data.query.timefilter.timefilter.getBounds()
  );

  // Initial search query
  const [query, setQuery] = useState<Query>({
    query: '',
    language: 'kuery',
  });

  useEffect(() => {
    const fetchFields = async () => {
      const fields = (await data.indexPatterns.getFieldsForWildcard({
        pattern: indexPattern.title,
      })) as IFieldType[];
      // TODO: strip out irrelevant fields such as data_stream.* and elastic_agent.*
      setIndexPattern({
        ...indexPattern,
        fields,
      });
      setIsSearchBarLoading(false);
    };
    fetchFields();
  }, [data.indexPatterns, indexPattern]);

  const searchBar = useMemo(
    () => (
      <SearchBar
        isLoading={isSearchBarLoading}
        indexPatterns={[indexPattern]}
        query={query}
        timeHistory={new TimeHistory(storage)}
        onQuerySubmit={({ dateRange: newDateRange, query: newQuery }) => {
          if (newQuery) setQuery(newQuery);
          setDateRange(data.query.timefilter.timefilter.calculateBounds(newDateRange));
        }}
      />
    ),
    [data.query.timefilter.timefilter, indexPattern, isSearchBarLoading, query, storage]
  );

  const logStream =
    dateRange.min && dateRange.max ? (
      <LogStream
        startTimestamp={dateRange.min.valueOf()}
        endTimestamp={dateRange.max.valueOf()}
        query={query.query ? `(${fixedQuery}) and (${query.query})` : fixedQuery}
      />
    ) : null;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>{searchBar}</EuiFlexItem>
      </EuiFlexGroup>
      {logStream}
    </>
  );
});
