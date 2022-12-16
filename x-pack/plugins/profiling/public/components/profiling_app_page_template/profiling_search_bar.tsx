/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect, useState } from 'react';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { DataView } from '@kbn/data-views-plugin/common';
import { compact } from 'lodash';
import { Query, TimeRange } from '@kbn/es-query';
import { useProfilingDependencies } from '../contexts/profiling_dependencies/use_profiling_dependencies';
import { INDEX_EVENTS } from '../../../common';

export function ProfilingSearchBar({
  kuery,
  rangeFrom,
  rangeTo,
  onQuerySubmit,
  onRefresh,
  onRefreshClick,
  showSubmitButton = true,
}: {
  kuery: string;
  rangeFrom: string;
  rangeTo: string;
  onQuerySubmit: (
    payload: {
      dateRange: TimeRange;
      query?: Query;
    },
    isUpdate?: boolean
  ) => void;
  onRefresh: Required<React.ComponentProps<typeof SearchBar>>['onRefresh'];
  onRefreshClick: () => void;
  showSubmitButton?: boolean;
}) {
  const {
    start: { dataViews },
  } = useProfilingDependencies();

  const [dataView, setDataView] = useState<DataView>();

  useEffect(() => {
    dataViews
      .create({
        title: INDEX_EVENTS,
      })
      .then((nextDataView) => setDataView(nextDataView));
  }, [dataViews]);

  const searchBarQuery: Required<React.ComponentProps<typeof SearchBar>>['query'] = {
    language: 'kuery',
    query: kuery,
  };

  return (
    <SearchBar<Query>
      onQuerySubmit={({ dateRange, query }) => {
        if (dateRange.from === rangeFrom && dateRange.to === rangeTo && query?.query === kuery) {
          onRefreshClick();
          return;
        }

        onQuerySubmit({ dateRange, query });
      }}
      showQueryInput
      showDatePicker
      showFilterBar={false}
      showSaveQuery={false}
      // showSubmitButton={showSubmitButton}
      showSubmitButton={true}
      query={searchBarQuery}
      dateRangeFrom={rangeFrom}
      dateRangeTo={rangeTo}
      indexPatterns={compact([dataView])}
      onRefresh={onRefresh}
    />
  );
}
