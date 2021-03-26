/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Breakdowns } from '../../series_editor/columns/breakdowns';
import { NEW_SERIES_KEY } from '../../hooks/use_url_strorage';
import { DataSeries } from '../../types';

export function ReportBreakdowns({ dataViewSeries }: { dataViewSeries: DataSeries }) {
  return <Breakdowns breakdowns={dataViewSeries.breakdowns ?? []} seriesId={NEW_SERIES_KEY} />;
}
