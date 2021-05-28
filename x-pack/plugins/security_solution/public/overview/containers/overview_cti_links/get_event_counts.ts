/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState, useMemo } from 'react';
import { usePrevious } from 'react-use';
import { i18n } from '@kbn/i18n';
import { MatrixHistogramType } from '../../../../common/search_strategy/security_solution';
import { useKibana } from '../../../common/lib/kibana';
import { ThreatIntelLinkPanelProps } from '../../components/overview_cti_links';
import { convertToBuildEsQuery } from '../../../common/lib/keury';
import { esQuery, Filter } from '../../../../../../../src/plugins/data/public';
import { useMatrixHistogram } from '../../../common/containers/matrix_histogram';
import { EVENT_DATASET } from '../../../../common/cti/constants';
import { TimeRange } from '../../../resolver/types';

export const ID = 'ctiEventCountQuery';

const ctiEventsFilter: Filter = {
  meta: {
    alias: null,
    disabled: false,
    key: 'event.dataset',
    negate: false,
    params: {
      query: 'file',
    },
    type: 'phrase',
  },
  query: {
    match_phrase: { 'event.module': 'threatintel' },
  },
};

export const useCTIEventCounts = (
  {
    deleteQuery,
    filters,
    from,
    indexNames,
    indexPattern,
    query,
    setQuery,
    to,
  }: ThreatIntelLinkPanelProps,
  timeRange: TimeRange
) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const { uiSettings } = useKibana().services;

  useEffect(() => {
    return () => {
      if (deleteQuery) {
        deleteQuery({ id: ID });
      }
    };
  }, [deleteQuery]);

  const matrixHistogramRequest = useMemo(
    () => ({
      endDate: to,
      errorMessage: i18n.translate('xpack.securitySolution.overview.errorFetchingEvents', {
        defaultMessage: 'Error fetching events',
      }),
      filterQuery: convertToBuildEsQuery({
        config: esQuery.getEsQueryConfig(uiSettings),
        indexPattern,
        queries: [query],
        filters: [...filters, ctiEventsFilter],
      }),
      histogramType: MatrixHistogramType.events,
      indexNames,
      stackByField: EVENT_DATASET,
      startDate: from,
    }),
    [filters, from, indexPattern, uiSettings, query, to, indexNames]
  );

  const [loading, { data, inspect, totalCount, refetch }] = useMatrixHistogram(
    matrixHistogramRequest
  );

  useEffect(() => {
    if (!loading && !isInitialLoading) {
      setQuery({ id: ID, inspect, loading, refetch });
    }
  }, [setQuery, inspect, loading, refetch, isInitialLoading, setIsInitialLoading]);

  useEffect(() => {
    if (isInitialLoading && data) {
      setIsInitialLoading(false);
    }
  }, [isInitialLoading, data]);

  const prevTimeRangeString = usePrevious(JSON.stringify(timeRange));
  useEffect(() => {
    if (prevTimeRangeString !== JSON.stringify(timeRange)) {
      refetch();
    }
  }, [timeRange, prevTimeRangeString, refetch]);

  const returnVal = {
    eventCounts: data.reduce((acc, item) => {
      if (item.y && item.g?.match('threatintel.')) {
        const id = item.g.replace('threatintel.', '');
        if (typeof acc[id] === 'number') {
          acc[id]! += item.y;
        } else {
          acc[id] = item.y;
        }
      }
      return acc;
    }, {} as { id: number | undefined; [key: string]: number | undefined }),
    total: totalCount,
  };

  return returnVal;
};
