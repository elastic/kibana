/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { getEsQueryConfig } from '@kbn/data-plugin/common';

import type { DataProvider } from '@kbn/timelines-plugin/common';
import { useKibana } from '../../../../lib/kibana';
import { combineQueries } from '../../../../lib/kuery';
import { useTimelineEvents } from '../../../../../timelines/containers';
import { useSourcererDataView } from '../../../../containers/sourcerer';
import { SourcererScopeName } from '../../../../store/sourcerer/model';

export interface UseInsightQuery {
  dataProviders: DataProvider[];
}

export interface UseInsightQueryResult {
  isQueryLoading: boolean;
  totalCount: number;
  oldestTimestamp: string | null | undefined;
}

export const useInsightQuery = ({ dataProviders }: UseInsightQuery): UseInsightQueryResult => {
  const { uiSettings } = useKibana().services;
  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const { browserFields, selectedPatterns, indexPattern, dataViewId } = useSourcererDataView(
    SourcererScopeName.timeline
  );
  const combinedQueries = combineQueries({
    config: esQueryConfig,
    dataProviders,
    indexPattern,
    browserFields,
    filters: [],
    kqlQuery: {
      query: '',
      language: 'kuery',
    },
    kqlMode: 'filter',
  });
  const [isQueryLoading, { events, totalCount }] = useTimelineEvents({
    dataViewId,
    fields: ['*'],
    filterQuery: combinedQueries?.filterQuery,
    id: 'timeline-1',
    indexNames: selectedPatterns,
    language: 'kuery',
    limit: 1,
    runtimeMappings: {},
  });
  const [oldestEvent] = events;
  const timestamp =
    oldestEvent && oldestEvent.data && oldestEvent.data.find((d) => d.field === '@timestamp');
  const oldestTimestamp = timestamp && timestamp.value && timestamp.value[0];
  return {
    isQueryLoading,
    totalCount,
    oldestTimestamp,
  };
};
