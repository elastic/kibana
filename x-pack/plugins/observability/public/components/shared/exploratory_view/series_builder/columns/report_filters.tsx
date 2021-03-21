/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SeriesFilter } from '../../series_editor/columns/series_filter';
import { NEW_SERIES_KEY } from '../../hooks/use_url_strorage';
import { getDefaultConfigs } from '../../configurations/default_configs';
import { ReportViewTypeId } from '../../types';

interface Props {
  reportType: ReportViewTypeId;
}
export const ReportFilters = ({ reportType }: Props) => {
  const dataSeries = getDefaultConfigs({
    reportType: reportType!,
    seriesId: NEW_SERIES_KEY,
  });

  return (
    <SeriesFilter
      series={dataSeries}
      defaultFilters={dataSeries.defaultFilters}
      seriesId={NEW_SERIES_KEY}
      isNew={true}
    />
  );
};
