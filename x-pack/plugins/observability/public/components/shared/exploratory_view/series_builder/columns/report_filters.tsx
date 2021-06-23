/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SeriesFilter } from '../../series_editor/columns/series_filter';
import { SeriesConfig } from '../../types';

export function ReportFilters({
  seriesConfig,
  seriesId,
}: {
  seriesConfig: SeriesConfig;
  seriesId: string;
}) {
  return (
    <SeriesFilter
      seriesConfig={seriesConfig}
      filterFields={seriesConfig.filterFields}
      baseFilters={seriesConfig.baseFilters}
      seriesId={seriesId}
      isNew={true}
      labels={seriesConfig.labels}
    />
  );
}
