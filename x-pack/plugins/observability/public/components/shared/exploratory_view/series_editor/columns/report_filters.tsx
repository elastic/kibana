/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SeriesConfig } from '../../types';
import { SeriesFilter } from '../../series_viewer/columns/series_filter';

export function ReportFilters({
  seriesConfig,
  seriesId,
}: {
  seriesConfig?: SeriesConfig;
  seriesId: string;
}) {
  if (!seriesConfig) {
    return null;
  }
  return (
    <SeriesFilter
      seriesConfig={seriesConfig}
      seriesId={seriesId}
      isNew={true}
      labels={seriesConfig.labels}
    />
  );
}
