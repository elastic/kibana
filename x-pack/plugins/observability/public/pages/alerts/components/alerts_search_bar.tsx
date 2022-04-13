/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DataViewBase } from '@kbn/es-query';
import React, { useMemo, useState } from 'react';
import { TimeHistory } from '../../../../../../../src/plugins/data/public';
import { DataView } from '../../../../../../../src/plugins/data_views/public';
import { SearchBar } from '../../../../../../../src/plugins/unified_search/public';
import { Storage } from '../../../../../../../src/plugins/kibana_utils/public';
import { translations } from '../../../config';

type QueryLanguageType = 'lucene' | 'kuery';

export function AlertsSearchBar({
  dynamicIndexPatterns,
  rangeFrom,
  rangeTo,
  onQueryChange,
  query,
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
      onRefresh={({ dateRange }) => {
        onQueryChange({ dateRange, query });
      }}
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
