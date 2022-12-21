/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { NO_INDEX_PATTERNS } from './constants';
import { SEARCH_BAR_PLACEHOLDER } from './translations';
import { AlertsSearchBarProps, QueryLanguageType } from './types';
import { useAlertDataView } from '../../hooks/use_alert_data_view';
import { TriggersAndActionsUiServices } from '../../..';

// TODO Share buildEsQuery to be used between AlertsSearchBar and AlertsStateTable component https://github.com/elastic/kibana/issues/144615
export function AlertsSearchBar({
  appName,
  featureIds,
  query,
  onQueryChange,
  rangeFrom,
  rangeTo,
}: AlertsSearchBarProps) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<TriggersAndActionsUiServices>().services;

  const [queryLanguage, setQueryLanguage] = useState<QueryLanguageType>('kuery');
  const { value: dataView, loading, error } = useAlertDataView(featureIds);

  const onQuerySubmit = useCallback(
    (payload) => {
      const { dateRange, query: nextQuery } = payload;
      onQueryChange({
        dateRange,
        query: typeof nextQuery?.query === 'string' ? nextQuery.query : '',
      });
      setQueryLanguage((nextQuery?.language ?? 'kuery') as QueryLanguageType);
    },
    [onQueryChange, setQueryLanguage]
  );

  return (
    <SearchBar
      appName={appName}
      indexPatterns={loading || error ? NO_INDEX_PATTERNS : [dataView!]}
      placeholder={SEARCH_BAR_PLACEHOLDER}
      query={{ query: query ?? '', language: queryLanguage }}
      dateRangeFrom={rangeFrom}
      dateRangeTo={rangeTo}
      displayStyle="inPage"
      showFilterBar={false}
      onQuerySubmit={onQuerySubmit}
    />
  );
}

// eslint-disable-next-line import/no-default-export
export { AlertsSearchBar as default };
