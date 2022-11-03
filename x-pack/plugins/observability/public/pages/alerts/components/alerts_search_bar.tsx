/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { DataView } from '@kbn/data-views-plugin/common';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { ValidFeatureId } from '@kbn/rule-data-utils';
import { translations } from '../../../config';
import { ObservabilityAppServices } from '../../../application/types';
import { useAlertDataView } from '../../../hooks/use_alert_data_view';

type QueryLanguageType = 'lucene' | 'kuery';

const NO_INDEX_PATTERNS: DataView[] = [];

export function AlertsSearchBar({
  appName,
  featureIds,
  query,
  onQueryChange,
  rangeFrom,
  rangeTo,
}: {
  appName: string;
  featureIds: ValidFeatureId[];
  rangeFrom?: string;
  rangeTo?: string;
  query?: string;
  onQueryChange: ({}: {
    dateRange: { from: string; to: string; mode?: 'absolute' | 'relative' };
    query?: string;
  }) => void;
}) {
  const {
    unifiedSearch: {
      ui: { SearchBar },
    },
  } = useKibana<ObservabilityAppServices>().services;

  const [queryLanguage, setQueryLanguage] = useState<QueryLanguageType>('kuery');
  const { value: dataView, loading, error } = useAlertDataView(featureIds);

  return (
    <SearchBar
      appName={appName}
      indexPatterns={loading || error ? NO_INDEX_PATTERNS : [dataView!]}
      placeholder={translations.alertsSearchBar.placeholder}
      query={{ query: query ?? '', language: queryLanguage }}
      dateRangeFrom={rangeFrom}
      dateRangeTo={rangeTo}
      displayStyle="inPage"
      showFilterBar={false}
      onQuerySubmit={({ dateRange, query: nextQuery }) => {
        onQueryChange({
          dateRange,
          query: typeof nextQuery?.query === 'string' ? nextQuery.query : '',
        });
        setQueryLanguage((nextQuery?.language ?? 'kuery') as QueryLanguageType);
      }}
    />
  );
}
