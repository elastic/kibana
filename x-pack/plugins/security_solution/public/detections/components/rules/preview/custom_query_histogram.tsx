/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useMemo, useState, useCallback } from 'react';

import * as i18n from './translations';
import { Language, Type } from '../../../../../common/detection_engine/schemas/common/schemas';
import { useMatrixHistogram } from '../../../../common/containers/matrix_histogram';
import { MatrixHistogramType } from '../../../../../common/search_strategy/security_solution/matrix_histogram';
import { PreviewQueryHistogram } from './histogram';
import { getQueryFilter } from '../../../../../common/detection_engine/get_query_filter';
import { FieldValueQueryBar } from '../query_bar';
import { ESQueryStringQuery } from '../../../../../common/typed_json';

interface PreviewCustomQueryProps {
  dataTestSubj: string;
  idAria: string;
  query: FieldValueQueryBar | undefined;
  index: string[];
  ruleType: Type;
  calculateTimeRange: (arg: string) => { to: string; from: string };
}

export const PreviewCustomQuery = ({
  dataTestSubj,
  idAria,
  query,
  index,
  ruleType,
  calculateTimeRange,
}: PreviewCustomQueryProps) => {
  const [toTiime, setTo] = useState('');
  const [fromTime, setFrom] = useState('');

  const handlePreviewClick = useCallback(
    (timeframe: string) => {
      const { to, from } = calculateTimeRange(timeframe);

      setTo(to);
      setFrom(from);
    },
    [calculateTimeRange]
  );

  const filterQuery = useMemo(() => {
    return query != null
      ? ((getQueryFilter(
          'host.name:*',
          query.query.language as Language,
          [],
          index,
          [],
          true
        ) as unknown) as ESQueryStringQuery)
      : undefined;
  }, [query, index]);

  const [loading, { data, inspect, totalCount }] = useMatrixHistogram({
    endDate: fromTime,
    errorMessage: i18n.QUERY_PREVIEW_ERROR,
    filterQuery,
    histogramType: MatrixHistogramType.events,
    indexNames: index,
    startDate: toTiime,
    stackByField: 'event.category',
  });

  return (
    <PreviewQueryHistogram
      dataTestSubj={dataTestSubj}
      idAria={idAria}
      onPreviewClick={handlePreviewClick}
      totalHits={totalCount}
      data={data}
      query={query}
      to={toTiime}
      from={fromTime}
      inspect={inspect}
      isLoading={loading}
      ruleType={ruleType}
    />
  );
};
