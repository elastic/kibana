/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { css } from '@emotion/css';
import type { TimeRange } from '@kbn/es-query';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import React, { useMemo } from 'react';
import type { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '../../hooks/use_kibana';

const parentClassName = css`
  width: 100%;
`;

interface Props {
  query: string;
  dateRangeFrom?: string;
  dateRangeTo?: string;
  onQueryChange: (payload: { dateRange?: TimeRange; query: string }) => void;
  onQuerySubmit: (payload: { dateRange?: TimeRange; query: string }, isUpdate?: boolean) => void;
  onRefresh?: Required<React.ComponentProps<typeof SearchBar>>['onRefresh'];
  placeholder?: string;
  dataViews?: DataView[];
}

export function InventorySearchBar({
  dateRangeFrom,
  dateRangeTo,
  onQueryChange,
  onQuerySubmit,
  onRefresh,
  query,
  placeholder,
  dataViews,
}: Props) {
  const {
    dependencies: {
      start: { unifiedSearch },
    },
  } = useKibana();

  const queryObj = useMemo(() => ({ query, language: 'kuery' }), [query]);

  return (
    <div className={parentClassName}>
      <unifiedSearch.ui.SearchBar
        appName="inventory"
        onQuerySubmit={({ dateRange, query: nextQuery }) => {
          onQuerySubmit({ dateRange, query: (nextQuery?.query as string | undefined) ?? '' });
        }}
        onQueryChange={({ dateRange, query: nextQuery }) => {
          onQueryChange({ dateRange, query: (nextQuery?.query as string | undefined) ?? '' });
        }}
        query={queryObj}
        showQueryInput
        showFilterBar={false}
        showQueryMenu={false}
        showDatePicker={Boolean(dateRangeFrom && dateRangeTo)}
        showSubmitButton={true}
        dateRangeFrom={dateRangeFrom}
        dateRangeTo={dateRangeTo}
        onRefresh={onRefresh}
        displayStyle="inPage"
        disableQueryLanguageSwitcher
        placeholder={placeholder}
        indexPatterns={dataViews}
      />
    </div>
  );
}
