/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import { getEsQueryConfig } from '@kbn/data-plugin/common';
import type { DataProvider } from '@kbn/timelines-plugin/common';
import { TimelineId } from '../../../../../../common/types/timeline';
import { useKibana } from '../../../../lib/kibana';
import { combineQueries } from '../../../../lib/kuery';
import { useTimelineEvents } from '../../../../../timelines/containers';
import { useSourcererDataView } from '../../../../containers/sourcerer';
import { SourcererScopeName } from '../../../../store/sourcerer/model';
import type { TimeRange } from '../../../../store/inputs/model';

export interface UseInsightQuery {
  dataProviders: DataProvider[];
  filters: Filter[];
  relativeTimerange: TimeRange | null;
}

export interface UseInsightQueryResult {
  isQueryLoading: boolean;
  totalCount: number;
  oldestTimestamp: string | null | undefined;
  hasError: boolean;
}

export const useInsightQuery = ({
  dataProviders,
  filters,
  relativeTimerange,
}: UseInsightQuery): UseInsightQueryResult => {
  const { uiSettings } = useKibana().services;
  const esQueryConfig = useMemo(() => getEsQueryConfig(uiSettings), [uiSettings]);
  const { browserFields, selectedPatterns, indexPattern, dataViewId } = useSourcererDataView(
    SourcererScopeName.timeline
  );
  const [hasError, setHasError] = useState(false);
  const combinedQueries = useMemo(() => {
    try {
      if (hasError === false) {
        const parsedCombinedQueries = combineQueries({
          config: esQueryConfig,
          dataProviders,
          indexPattern,
          browserFields,
          filters,
          kqlQuery: {
            query: '',
            language: 'kuery',
          },
          kqlMode: 'filter',
        });
        return parsedCombinedQueries;
      }
    } catch (err) {
      setHasError(true);
      return null;
    }
  }, [browserFields, dataProviders, esQueryConfig, hasError, indexPattern, filters]);

  const [isQueryLoading, { events, totalCount }] = useTimelineEvents({
    dataViewId,
    fields: ['*'],
    filterQuery: combinedQueries?.filterQuery,
    id: TimelineId.active,
    indexNames: selectedPatterns,
    language: 'kuery',
    limit: 1,
    runtimeMappings: {},
    ...(relativeTimerange
      ? { startDate: relativeTimerange?.from, endDate: relativeTimerange?.to }
      : {}),
  });
  const [oldestEvent] = events;
  const timestamp =
    oldestEvent && oldestEvent.data && oldestEvent.data.find((d) => d.field === '@timestamp');
  const oldestTimestamp = timestamp && timestamp.value && timestamp.value[0];
  return {
    isQueryLoading,
    totalCount,
    oldestTimestamp,
    hasError,
  };
};
