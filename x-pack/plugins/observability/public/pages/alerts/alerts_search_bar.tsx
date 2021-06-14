/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { SearchBar, TimeHistory } from '../../../../../../src/plugins/data/public';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';
import { useFetcher } from '../../hooks/use_fetcher';
import { callObservabilityApi } from '../../services/call_observability_api';

export function AlertsSearchBar({
  rangeFrom,
  rangeTo,
  onQueryChange,
  query,
}: {
  rangeFrom?: string;
  rangeTo?: string;
  query?: string;
  onQueryChange: ({}: {
    dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
    query?: string;
  }) => void;
}) {
  const timeHistory = useMemo(() => {
    return new TimeHistory(new Storage(localStorage));
  }, []);
  const [queryLanguage, setQueryLanguage] = useState<'lucene' | 'kuery'>('kuery');

  const { data: dynamicIndexPattern } = useFetcher(({ signal }) => {
    return callObservabilityApi({
      signal,
      endpoint: 'GET /api/observability/rules/alerts/dynamic_index_pattern',
    });
  }, []);

  return (
    <SearchBar
      indexPatterns={dynamicIndexPattern ? [dynamicIndexPattern] : []}
      placeholder={i18n.translate('xpack.observability.alerts.searchBarPlaceholder', {
        defaultMessage: '"domain": "ecommerce" AND ("service.name": "ProductCatalogService" …)',
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
