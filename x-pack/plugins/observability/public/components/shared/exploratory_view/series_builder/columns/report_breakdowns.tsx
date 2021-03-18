/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Breakdowns } from '../../series_editor/columns/breakdowns';
import { NEW_SERIES_KEY, useUrlStorage } from '../../hooks/use_url_strorage';
import { getDefaultConfigs } from '../../configurations/default_configs';

export const ReportBreakdowns = () => {
  const {
    series: { reportType },
  } = useUrlStorage(NEW_SERIES_KEY);

  const dataSeries = getDefaultConfigs({
    reportType: reportType!,
    seriesId: NEW_SERIES_KEY,
  });
  return <Breakdowns breakdowns={dataSeries.breakdowns ?? []} seriesId={NEW_SERIES_KEY} />;
};
