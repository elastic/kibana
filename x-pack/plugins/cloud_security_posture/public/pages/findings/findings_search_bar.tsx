/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import type { Query } from '@kbn/es-query';
import type { Filter } from '@kbn/es-query';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';
import { TEST_SUBJECTS } from './constants';
import type { DataView, TimeRange } from '../../../../../../src/plugins/data/common';
import type { FindingsFetchState } from './types';
import type { CspPluginSetup } from '../../types';
import type { URLState } from './findings_container';

interface BaseFindingsSearchBarProps {
  dataView: DataView;
  dateRange: TimeRange;
  query: Query;
  filters: Filter[];
  setSource(v: URLState): void;
}

type FindingsSearchBarProps = FindingsFetchState & BaseFindingsSearchBarProps;

/**
 * Temporary Search Bar using x-pack/plugins/data
 *
 */
export const FindingsSearchBar = ({
  dataView,
  dateRange,
  query,
  filters,
  status,
  setSource,
}: FindingsSearchBarProps) => {
  const {
    data: {
      ui: { SearchBar },
    },
  } = useKibana<CspPluginSetup>().services;

  return (
    <SearchBar
      appName="" // TODO: remove
      dataTestSubj={TEST_SUBJECTS.FINDINGS_SEARCH_BAR}
      showFilterBar={true}
      showDatePicker={true}
      showQueryBar={true}
      showQueryInput={true}
      showSaveQuery={true}
      isLoading={status === 'loading'}
      indexPatterns={[dataView]}
      dateRangeFrom={dateRange?.from}
      dateRangeTo={dateRange?.to}
      query={query}
      filters={filters}
      onRefresh={(v) =>
        setSource({
          query,
          filters,
          ...v,
        })
      }
      // 'onFiltersUpdated' is not on StatefulSearchBarProps
      // TODO: use SearchBar by import and not via props?
      // @ts-ignore
      onFiltersUpdated={(v) =>
        setSource({
          filters: v,
          query,
          dateRange,
        })
      }
      onQuerySubmit={(v) =>
        setSource({
          ...v,
          filters,
        })
      }
    />
  );
};
