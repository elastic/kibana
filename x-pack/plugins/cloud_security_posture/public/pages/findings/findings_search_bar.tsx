/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useEffect } from 'react';
import type { Query } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import * as TEST_SUBJECTS from './test_subjects';
import type { DataView, TimeRange } from '../../../../../../src/plugins/data/common';
import type { FindingsFetchState } from './types';
import type { CspPluginSetup } from '../../types';
import type { FindingsUrlQuery } from './findings_container';
import { PLUGIN_NAME } from '../../../common';

interface BaseFindingsSearchBarProps {
  dataView: DataView;
  dateRange: TimeRange;
  query: Query;
  filters: Filter[];
  setQuery(v: FindingsUrlQuery): void;
}

type FindingsSearchBarProps = FindingsFetchState & BaseFindingsSearchBarProps;

export const FindingsSearchBar = ({
  dataView,
  dateRange,
  query,
  filters,
  status,
  setQuery,
}: FindingsSearchBarProps) => {
  const {
    data: {
      query: queryService,
      ui: { SearchBar },
    },
  } = useKibana<CspPluginSetup>().services;

  useEffect(() => {
    const subscription = queryService.filterManager.getUpdates$().subscribe(() =>
      // TODO: add a condition to check if component is mounted
      setQuery({
        filters: queryService.filterManager.getFilters(),
        query,
        dateRange,
      })
    );

    return () => subscription.unsubscribe();
  }, [dateRange, query, queryService.filterManager, setQuery]);

  return (
    <SearchBar
      appName={PLUGIN_NAME}
      dataTestSubj={TEST_SUBJECTS.FINDINGS_SEARCH_BAR}
      showFilterBar={true}
      showDatePicker={true}
      showQueryBar={true}
      showQueryInput={true}
      showSaveQuery={false}
      isLoading={status === 'loading'}
      indexPatterns={[dataView]}
      dateRangeFrom={dateRange?.from}
      dateRangeTo={dateRange?.to}
      query={query}
      filters={filters}
      onRefresh={(v) =>
        setQuery({
          query,
          filters,
          ...v,
        })
      }
      onQuerySubmit={(v) =>
        setQuery({
          query,
          filters,
          ...v,
        })
      }
    />
  );
};
