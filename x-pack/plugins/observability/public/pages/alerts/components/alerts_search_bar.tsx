/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewBase } from '@kbn/es-query';
import React, { useMemo, useState } from 'react';
import { TimeHistory } from '@kbn/data-plugin/public';
import { DataView } from '@kbn/data-views-plugin/public';
import { SearchBar } from '@kbn/unified-search-plugin/public';
import { Storage } from '@kbn/kibana-utils-plugin/public';
import { translations } from '../../../config';

type QueryLanguageType = 'lucene' | 'kuery';

export function AlertsSearchBar({
  dynamicIndexPatterns,
  onQueryChange,
  query,
  rangeFrom,
  rangeTo,
}: {
  dynamicIndexPatterns: DataViewBase[];
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
  const [queryLanguage, setQueryLanguage] = useState<QueryLanguageType>('kuery');

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
      indexPatterns={compatibleIndexPatterns as DataView[]}
      placeholder={translations.alertsSearchBar.placeholder}
      query={{ query: query ?? '', language: queryLanguage }}
      timeHistory={timeHistory}
      dateRangeFrom={rangeFrom}
      dateRangeTo={rangeTo}
      onQuerySubmit={({ dateRange, query: nextQuery }) => {
        onQueryChange({
          dateRange,
          query: typeof nextQuery?.query === 'string' ? nextQuery.query : '',
        });
        setQueryLanguage((nextQuery?.language ?? 'kuery') as QueryLanguageType);
      }}
      displayStyle="inPage"
    />
  );
}
