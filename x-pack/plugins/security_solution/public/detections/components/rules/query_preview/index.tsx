/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState, useMemo, useEffect } from 'react';
import { Unit } from '@elastic/datemath';
import { getOr } from 'lodash/fp';

import { IndexPattern } from 'src/plugins/data/public';
import * as i18n from './translations';
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
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';

export const ID = 'queryPreviewHistogramQuery';

interface PreviewQueryProps {
  dataTestSubj: string;
  idAria: string;
  query: FieldValueQueryBar | undefined;
  index: string[];
  ruleType: Type;
  threshold: { field: string | undefined; value: number } | undefined;
  isDisabled: boolean;
}

export const PreviewQuery = ({
  ruleType,
  dataTestSubj,
  idAria,
  query,
  index,
  threshold,
  isDisabled,
}: PreviewQueryProps) => {
  // how far back to look like 'now-6m'
  const [toTime, setTo] = useState('');
  // the more recent time like 'now'
  const [fromTime, setFrom] = useState('');
  const { data } = useKibana().services;
  const [, { indexPatterns }] = useFetchIndex(index);
  const { addError } = useAppToasts();
  const {
    error: customQueryError,
    start: startCustomQuery,
    result: customQueryResult,
    loading: customQueryLoading,
  } = useMatrixHistogramAsync();
  const {
    error: eqlError,
    start: startEql,
    result: eqlQueryResult,
    loading: eqlQueryLoading,
  } = useEqlPreview();

  const queryString = useMemo((): string => getOr('', 'query.query', query), [query]);
  const language = useMemo((): Language => getOr('kuery', 'query.language', query), [query]);

  const handleCalculateTimeRange = useCallback(
    (interval: Unit): { to: string; from: string } => {
      const rangeFilter: RangeFilter | undefined = data.query.timefilter.timefilter.createFilter(
        { ...indexPatterns, timeFieldName: '@timestamp' } as IndexPattern,
        { from: `now-1${interval}`, to: 'now' }
      );

      const to = rangeFilter != null ? `${rangeFilter.range['@timestamp'].gte}` : null;
      const from = rangeFilter != null ? `${rangeFilter.range['@timestamp'].lte}` : null;

      if (to != null && from != null) {
        setTo(to);
        setFrom(from);
      }

      return { to: to ?? toTime, from: from ?? fromTime };
    },
    [data, indexPatterns, toTime, fromTime]
  );

  const handlePreviewEqlQuery = useCallback(
    (to: string, from: string, interval: Unit): void => {
      startEql({
        data,
        index,
        query: queryString,
        fromTime: from,
        toTime: to,
        interval,
      });
    },
    [data, index, startEql, queryString]
  );

  const handlePreviewNonEqlQuery = useCallback(
    (filterQuery: ESQueryStringQuery | undefined, to: string, from: string): void => {
      const thresholdField =
        ruleType === 'threshold' && threshold != null ? { ...threshold } : undefined;
      startCustomQuery({
        data,
        endDate: from,
        filterQuery,
        histogramType: MatrixHistogramType.events,
        indexNames: index,
        startDate: to,
        stackByField: 'event.category',
        threshold: thresholdField,
      });
    },
    [index, data, startCustomQuery, threshold, ruleType]
  );

  const handlePreviewClick = useCallback(
    (interval: Unit) => {
      const { to, from } = handleCalculateTimeRange(interval);

      if (ruleType === 'eql') {
        handlePreviewEqlQuery(to, from, interval);
      } else {
        const filterQuery =
          queryString.trim() !== ''
            ? {
                ...((getQueryFilter(
                  queryString,
                  language,
                  [],
                  index,
                  [],
                  true
                ) as unknown) as ESQueryStringQuery),
              }
            : undefined;

        handlePreviewNonEqlQuery(filterQuery, to, from);
      }
    },
    [
      handleCalculateTimeRange,
      ruleType,
      handlePreviewEqlQuery,
      queryString,
      language,
      index,
      handlePreviewNonEqlQuery,
    ]
  );

  const queryResult = useMemo((): {
    totalHits: number;
    data: ChartData[];
    inspect: InspectQuery;
    warnings: string[];
  } => {
    if (ruleType === 'eql' && eqlQueryResult != null) {
      return {
        totalHits: eqlQueryResult.totalCount,
        data: eqlQueryResult.data,
        inspect: eqlQueryResult.inspect,
        warnings: eqlQueryResult.warnings,
      };
    } else if (customQueryResult != null) {
      return {
        totalHits: customQueryResult.totalCount,
        data: customQueryResult.data,
        inspect: customQueryResult.inspect,
        warnings: [],
      };
    } else {
      return { totalHits: 0, data: [], inspect: { dsl: [], response: [] }, warnings: [] };
    }
  }, [ruleType, eqlQueryResult, customQueryResult]);

  useEffect((): void => {
    if (customQueryError != null) {
      addError(customQueryError, { title: i18n.PREVIEW_QUERY_ERROR });
    }
  }, [customQueryError, addError]);

  useEffect((): void => {
    if (eqlError != null) {
      addError(eqlError, { title: i18n.PREVIEW_QUERY_ERROR });
    }
  }, [eqlError, addError]);

  return (
    <PreviewQueryHistogram
      dataTestSubj={dataTestSubj}
      idAria={idAria}
      onPreviewClick={handlePreviewClick}
      totalHits={queryResult.totalHits}
      data={queryResult.data}
      query={queryString}
      to={toTime}
      from={fromTime}
      inspect={queryResult.inspect}
      isLoading={eqlQueryLoading || customQueryLoading}
      ruleType={ruleType}
      errorExists={customQueryError != null || eqlError != null}
      isDisabled={isDisabled}
      threshold={threshold}
      warnings={queryResult.warnings}
    />
  );
};
