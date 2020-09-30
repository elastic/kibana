/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback, useState } from 'react';

import { useEqlPreview } from '../../../../common/hooks/eql';

import { PreviewQueryHistogram } from './histogram';
import { FieldValueQueryBar } from '../query_bar';
import { Type } from '../../../../../common/detection_engine/schemas/common/schemas';
import { StartPlugins } from '../../../../../public/types';

interface PreviewEqlQueryProps {
  dataTestSubj: string;
  idAria: string;
  data: StartPlugins['data'];
  query: FieldValueQueryBar | undefined;
  index: string[];
  ruleType: Type;
  calculateTimeRange: (arg: string) => { to: string; from: string };
}

export const PreviewEqlQuery = ({
  dataTestSubj,
  idAria,
  query,
  index,
  data,
  ruleType,
  calculateTimeRange,
}: PreviewEqlQueryProps) => {
  const [toTiime, setTo] = useState('');
  const [fromTime, setFrom] = useState('');
  // TODO: deal with errors
  const { start, result, loading } = useEqlPreview();

  const handlePreviewClicked = useCallback(
    (timeframe: string): void => {
      const { to, from } = calculateTimeRange(timeframe);

      setTo(to);
      setFrom(from);

      start({
        data,
        index,
        query:
          query && query.query && typeof query.query.query === 'string' ? query.query.query : '',
        fromTime: from,
        toTime: to,
        interval: timeframe,
      });
    },
    [start, data, index, query, calculateTimeRange]
  );

  return (
    <PreviewQueryHistogram
      dataTestSubj={dataTestSubj}
      idAria={idAria}
      onPreviewClick={handlePreviewClicked}
      totalHits={result != null ? result.total : 0}
      data={result != null ? result.data : []}
      query={query}
      to={toTiime}
      from={fromTime}
      ruleType={ruleType}
      inspect={result != null ? result.inspect : { dsl: [], response: [] }}
      isLoading={loading}
    />
  );
};
