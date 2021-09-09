/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { IndexPatternBase } from '@kbn/es-query';
import { i18n } from '@kbn/i18n';
import React, { useMemo, useState } from 'react';
import { SearchBar, TimeHistory } from '../../../../../../src/plugins/data/public';
import { Storage } from '../../../../../../src/plugins/kibana_utils/public';

export function AlertsSearchBar({
  dynamicIndexPatterns,
  rangeFrom,
  rangeTo,
  onQueryChange,
  query,
}: {
  dynamicIndexPatterns: IndexPatternBase[];
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

  const compatibleIndexPatterns = useMemo(
    () =>
      dynamicIndexPatterns.map((dynamicIndexPattern) => ({
        title: dynamicIndexPattern.title ?? '',
        id: dynamicIndexPattern.id ?? '',
        fields: dynamicIndexPattern.fields,
      })),
    [dynamicIndexPatterns]
  );

  return (
    <SearchBar
      indexPatterns={compatibleIndexPatterns}
      placeholder={i18n.translate('xpack.observability.alerts.searchBarPlaceholder', {
        defaultMessage: 'Search alerts (e.g. kibana.alert.evaluation.threshold > 75)',
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
      displayStyle="inPage"
    />
  );
}
