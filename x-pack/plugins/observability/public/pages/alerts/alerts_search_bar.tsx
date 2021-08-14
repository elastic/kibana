/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useMemo, useState, useEffect } from 'react';
import { Subscription } from 'rxjs';
import {
  IIndexPattern,
  SearchBar,
  TimeHistory,
  FilterManager,
  Filter,
} from '../../../../../../src/plugins/data/public';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { useKibana } from '../../../../../../src/plugins/kibana_react/public';

export function AlertsSearchBar({
  dynamicIndexPattern,
  rangeFrom,
  rangeTo,
  onQueryChange,
  setSearchBarFilter,
  query,
  addToQuery,
}: {
  dynamicIndexPattern: IIndexPattern[];
  rangeFrom?: string;
  rangeTo?: string;
  query?: string;
  onQueryChange: ({}: {
    dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
    query?: string;
  }) => void;
  setSearchBarFilter: ({}: { filters: Filter[] }) => void;
  addToQuery: (value: string) => void;
  filterManager?: FilterManager;
}) {
  const timeHistory = useMemo(() => {
    return new TimeHistory(new Storage(localStorage));
  }, []);
  const [queryLanguage, setQueryLanguage] = useState<'lucene' | 'kuery'>('kuery');
  // const [setSearchBarFilter]
  const {
    data: {
      query: { filterManager },
    },
  } = useKibana().services;
  useEffect(() => {
    const isSubscribed = true;
    const subscriptions = new Subscription();
    subscriptions.add(
      filterManager.getUpdates$().subscribe({
        next: () => {
          if (isSubscribed) {
            console.log(filterManager.getFilters(), '!!sub');
            // saveAppStateToStorage(filterManager.getAppFilters());
            setSearchBarFilter({
              filters: filterManager.getFilters(),
            });
          }
        },
      })
    );
  });
  return (
    <SearchBar
      indexPatterns={dynamicIndexPattern}
      placeholder={i18n.translate('xpack.observability.alerts.searchBarPlaceholder', {
        defaultMessage: 'kibana.alert.evaluation.threshold > 75',
      })}
      query={{ query: query ?? '', language: queryLanguage }}
      timeHistory={timeHistory}
      dateRangeFrom={rangeFrom}
      dateRangeTo={rangeTo}
      onRefresh={({ dateRange }) => {
        onQueryChange({ dateRange, query });
      }}
      onQuerySubmit={({ dateRange, query: nextQuery }) => {
        onQueryChange({
          dateRange,
          query: typeof nextQuery?.query === 'string' ? nextQuery.query : '',
        });
        setQueryLanguage((nextQuery?.language || 'kuery') as 'kuery' | 'lucene');
      }}
    />
  );
}
