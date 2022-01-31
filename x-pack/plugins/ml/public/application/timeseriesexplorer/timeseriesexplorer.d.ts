/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { TimeRangeBounds } from '../util/time_buckets';

interface Props {
  appStateHandler: (action: string, payload: any) => void;
  autoZoomDuration: number | undefined;
  bounds: TimeRangeBounds | undefined;
  dateFormatTz: string;
  lastRefresh: number;
  selectedJobId: string | undefined;
  selectedDetectorIndex: number;
  selectedEntities: Record<string, string> | undefined;
  selectedForecastId?: string;
  tableInterval: string;
  tableSeverity: number;
  zoom?: { from?: string; to?: string };
}

// eslint-disable-next-line react/prefer-stateless-function
declare class TimeSeriesExplorer extends React.Component<Props> {}
