/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AvgIndexPatternColumn,
  CountIndexPatternColumn,
  DateHistogramIndexPatternColumn,
  LastValueIndexPatternColumn,
} from '../../../../../lens/public';

export type DataViewType = 'page-load-dist' | 'page-views' | 'uptime-duration' | 'uptime-pings';

export interface DataSeries {
  dataViewType: DataViewType;
  indexPattern: string;
  name: string;
  id: string;
  xAxisColumn: Partial<LastValueIndexPatternColumn> | Partial<DateHistogramIndexPatternColumn>;
  yAxisColumn:
    | Partial<LastValueIndexPatternColumn>
    | Partial<CountIndexPatternColumn>
    | Partial<AvgIndexPatternColumn>;
  breakdowns: string[];
  defaultSeriesType: string;
  defaultFilters: string[];
  seriesTypes?: string[];
  filters?: Record<string, any>;
}

export interface SeriesUrl {
  time: {
    to: string;
    from: string;
  };
  breakdown: string;
  filters: UrlFilter[];
  seriesType: string;
}

export interface UrlFilter {
  field: string;
  values?: string[];
  notValues?: string[];
}
