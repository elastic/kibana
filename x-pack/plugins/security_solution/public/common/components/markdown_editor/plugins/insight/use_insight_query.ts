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
import { DataLoadingState } from '@kbn/unified-data-table';
import { TimelineId } from '../../../../../../common/types/timeline';
import { useKibana } from '../../../../lib/kibana';
import { combineQueries } from '../../../../lib/kuery';
import { useTimelineEvents } from '../../../../../timelines/containers';
import { useSourcererDataView } from '../../../../../sourcerer/containers';
import { SourcererScopeName } from '../../../../../sourcerer/store/model';
import type { TimeRange } from '../../../../store/inputs/model';

const fields = ['*'];
const runtimeMappings = {};

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
  const { browserFields, selectedPatterns, sourcererDataView, dataViewId } = useSourcererDataView(
    SourcererScopeName.timeline
  );
  const [hasError, setHasError] = useState(false);
  const combinedQueries = useMemo(() => {
    try {
      if (hasError === false) {
        const parsedCombinedQueries = combineQueries({
          config: esQueryConfig,
          dataProviders,
          indexPattern: sourcererDataView,
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
  }, [browserFields, dataProviders, esQueryConfig, hasError, sourcererDataView, filters]);

  const [dataLoadingState, { events, totalCount }] = useTimelineEvents({
    dataViewId,
    fields,
    filterQuery: combinedQueries?.filterQuery,
    id: TimelineId.active,
    indexNames: selectedPatterns,
    language: 'kuery',
    limit: 1,
    runtimeMappings,
    startDate: relativeTimerange?.from,
    endDate: relativeTimerange?.to,
    fetchNotes: false,
  });

  const isQueryLoading = useMemo(
    () => [DataLoadingState.loading, DataLoadingState.loadingMore].includes(dataLoadingState),
    [dataLoadingState]
  );

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
