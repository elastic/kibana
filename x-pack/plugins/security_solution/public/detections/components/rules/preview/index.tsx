/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { useCallback } from 'react';

import { useKibana } from '../../../../common/lib/kibana';
import { useFetchIndex } from '../../../../common/containers/source';
import { PreviewEqlQuery } from './eql_query_histogram';
import { PreviewCustomQuery } from './custom_query_histogram';
import { FieldValueQueryBar } from '../query_bar';
import { RangeFilter } from '../../../../../../../../src/plugins/data/common/es_query';
import { Type } from '../../../../../common/detection_engine/schemas/common/schemas';

export const ID = 'queryPreviewHistogramQuery';

interface PreviewQueryProps {
  dataTestSubj: string;
  idAria: string;
  query: FieldValueQueryBar | undefined;
  index: string[];
  ruleType: Type;
}

// dynamically get from and to
// calculate bounds
// decide how to handle bounds you know they won't have data for

export const PreviewQuery = ({
  ruleType,
  dataTestSubj,
  idAria,
  query,
  index,
}: PreviewQueryProps) => {
  const { data } = useKibana().services;
  const [, { indexPatterns }] = useFetchIndex(index);

  const handleCalculateTimeRange = useCallback(
    (timeframe: string): { to: string; from: string } => {
      const rangeFilter: RangeFilter | undefined = data.query.timefilter.timefilter.createFilter(
        { ...indexPatterns, timeFieldName: '@timestamp' },
        { from: `now-1${timeframe}`, to: 'now' }
      );

      return {
        to: rangeFilter != null ? `${rangeFilter.range['@timestamp'].gte}` : '',
        from: rangeFilter != null ? `${rangeFilter.range['@timestamp'].lte}` : '',
      };
    },
    [data, indexPatterns]
  );

  switch (ruleType) {
    case 'eql':
      return (
        <PreviewEqlQuery
          index={index}
          dataTestSubj={dataTestSubj}
          idAria={idAria}
          query={query}
          data={data}
          ruleType={ruleType}
          calculateTimeRange={handleCalculateTimeRange}
        />
      );
    default:
      return (
        <PreviewCustomQuery
          index={index}
          dataTestSubj={dataTestSubj}
          idAria={idAria}
          query={query}
          ruleType={ruleType}
          calculateTimeRange={handleCalculateTimeRange}
        />
      );
  }
};
