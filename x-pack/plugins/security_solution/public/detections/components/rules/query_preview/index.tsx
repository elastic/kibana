/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, useMemo } from 'react';

import { useKibana } from '../../../../common/lib/kibana';
import { useFetchIndex } from '../../../../common/containers/source';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import { ESQueryStringQuery } from '../../../../../common/typed_json';
import { FieldValueQueryBar } from '../query_bar';
import { RangeFilter } from '../../../../../../../../src/plugins/data/common/es_query';
import { Language, Type } from '../../../../../common/detection_engine/schemas/common/schemas';
import { useMatrixHistogramAsync } from '../../../../common/containers/matrix_histogram/use_matrix_histogram_async';
import { PreviewQueryHistogram } from './histogram';
import { MatrixHistogramType } from '../../../../../common/search_strategy/security_solution/matrix_histogram';
import { useEqlPreview } from '../../../../common/hooks/eql';
import { InspectQuery } from '../../../../common/store/inputs/model';
import { ChartData } from '../../../../common/components/charts/common';

export const ID = 'queryPreviewHistogramQuery';

interface PreviewQueryProps {
  dataTestSubj: string;
  idAria: string;
  query: FieldValueQueryBar | undefined;
  index: string[];
  ruleType: Type;
}

export const PreviewQuery = ({
  ruleType,
  dataTestSubj,
  idAria,
  query,
  index,
}: PreviewQueryProps) => {
  const [toTime, setTo] = useState('');
  const [fromTime, setFrom] = useState('');
  const { data } = useKibana().services;
  const [, { indexPatterns }] = useFetchIndex(index);
  // TODO: deal with errors
  const {
    start: startCustomQuery,
    result: customQueryResult,
    loading: customQueryLoading,
  } = useMatrixHistogramAsync();
  const { start: startEql, result: eqlQueryResult, loading: eqlQueryLoading } = useEqlPreview();

  const handleCalculateTimeRange = useCallback(
    (interval: string): { to: string; from: string } => {
      const rangeFilter: RangeFilter | undefined = data.query.timefilter.timefilter.createFilter(
        { ...indexPatterns, timeFieldName: '@timestamp' },
        { from: `now-1${interval}`, to: 'now' }
      );

      const to = rangeFilter != null ? `${rangeFilter.range['@timestamp'].gte}` : '';
      const from = rangeFilter != null ? `${rangeFilter.range['@timestamp'].lte}` : '';
      setTo(to);
      setFrom(from);
      return { to, from };
    },
    [data, indexPatterns]
  );

  const handleEqlPreviewQuery = useCallback(
    (queryString: string, to: string, from: string, interval: string): void => {
      startEql({
        data,
        index,
        query: queryString,
        fromTime: from,
        toTime: to,
        interval,
      });
    },
    [data, index, startEql]
  );

  const handlePreviewCustomQuery = useCallback(
    (filterQuery: ESQueryStringQuery | undefined, to: string, from: string): void => {
      startCustomQuery({
        data,
        endDate: from,
        filterQuery,
        histogramType: MatrixHistogramType.events,
        indexNames: index,
        startDate: to,
        stackByField: 'event.category',
      });
    },
    [index, data, startCustomQuery]
  );

  const handlePreviewClick = useCallback(
    (interval: string) => {
      const { to, from } = handleCalculateTimeRange(interval);
      const q =
        query != null && query.query != null && typeof query.query.query === 'string'
          ? query.query.query
          : '';
      const filterQuery =
        q.trim() !== ''
          ? ((getQueryFilter(
              q,
              query.query.language as Language,
              [],
              index,
              [],
              true
            ) as unknown) as ESQueryStringQuery)
          : undefined;

      if (ruleType === 'eql') {
        handleEqlPreviewQuery(q, to, from, interval);
      } else {
        handlePreviewCustomQuery(filterQuery, to, from);
      }
    },
    [
      handleCalculateTimeRange,
      query,
      index,
      ruleType,
      handleEqlPreviewQuery,
      handlePreviewCustomQuery,
    ]
  );

  const queryResult = useMemo((): {
    totalHits: number;
    data: ChartData[];
    inspect: InspectQuery;
  } => {
    if (ruleType === 'eql' && eqlQueryResult != null) {
      return {
        totalHits: eqlQueryResult.totalCount,
        data: eqlQueryResult.data,
        inspect: eqlQueryResult.inspect,
      };
    } else if (customQueryResult != null) {
      return {
        totalHits: customQueryResult.totalCount,
        data: customQueryResult.data,
        inspect: customQueryResult.inspect,
      };
    } else {
      return { totalHits: 0, data: [], inspect: { dsl: [], response: [] } };
    }
  }, [ruleType, eqlQueryResult, customQueryResult]);

  return (
    <PreviewQueryHistogram
      dataTestSubj={dataTestSubj}
      idAria={idAria}
      onPreviewClick={handlePreviewClick}
      totalHits={queryResult.totalHits}
      data={queryResult.data}
      query={query}
      to={toTime}
      from={fromTime}
      inspect={queryResult.inspect}
      isLoading={eqlQueryLoading || customQueryLoading}
      ruleType={ruleType}
    />
  );
};
