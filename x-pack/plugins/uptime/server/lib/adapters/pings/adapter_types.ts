/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { UMGqlRange, UMPingSortDirectionArg } from '../../../../common/domain_types';
import { DocCount, HistogramSeries, Ping, PingResults } from '../../../../common/graphql/types';

export interface UMPingsAdapter {
  getAll(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number,
    monitorId?: string,
    status?: string,
    sort?: UMPingSortDirectionArg,
    size?: number
  ): Promise<PingResults>;

  getLatestMonitorDocs(
    request: any,
    dateRangeStart: number,
    dateRangeEnd: number,
    monitorId?: string
  ): Promise<Ping[]>;

  getPingHistogram(
    request: any,
    range: UMGqlRange,
    filters?: string
  ): Promise<HistogramSeries[] | null>;

  getDocCount(request: any): Promise<DocCount>;
}
