/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SeriesConfig, SeriesUrl } from '../../types';
import { TRANSACTION_URL } from '../../configurations/constants/elasticsearch_fieldnames';
import { useFilterValues } from '../../series_editor/use_filter_values';

interface Props {
  query?: string;
  seriesId: number;
  series: SeriesUrl;
  seriesConfig: SeriesConfig;
}
export const useUrlSearch = ({ series, query, seriesId, seriesConfig }: Props) => {
  const { values, loading } = useFilterValues(
    {
      series,
      seriesId,
      field: TRANSACTION_URL,
      baseFilters: seriesConfig.baseFilters,
      label: seriesConfig.labels[TRANSACTION_URL],
    },
    query
  );

  return { values, loading };
};
