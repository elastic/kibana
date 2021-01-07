/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';

import { TimeRangeBounds } from '../explorer/explorer_utils';

interface Props {
  appStateHandler: (action: string, payload: any) => void;
  autoZoomDuration: number;
  bounds: TimeRangeBounds;
  dateFormatTz: string;
  lastRefresh: number;
  selectedJobId: string;
  selectedDetectorIndex: number;
  selectedEntities: Record<string, string> | undefined;
  selectedForecastId?: string;
  tableInterval: string;
  tableSeverity: number;
  zoom?: { from?: string; to?: string };
}

// eslint-disable-next-line react/prefer-stateless-function
declare class TimeSeriesExplorer extends React.Component<Props, any> {}
