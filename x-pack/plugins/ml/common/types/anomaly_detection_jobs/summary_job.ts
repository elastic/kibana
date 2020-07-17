/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Moment } from 'moment';

import { CombinedJob, CombinedJobWithStats } from './combined_job';
export { Datafeed } from './datafeed';
export { DatafeedStats } from './datafeed_stats';

export interface MlSummaryJob {
  id: string;
  description: string;
  groups: string[];
  processed_record_count?: number;
  memory_status?: string;
  jobState: string;
  datafeedIndices: string[];
  hasDatafeed: boolean;
  datafeedId: string;
  datafeedState: string;
  latestTimestampMs?: number;
  earliestTimestampMs?: number;
  latestResultsTimestampMs?: number;
  fullJob?: CombinedJob;
  nodeName?: string;
  auditMessage?: Partial<AuditMessage>;
  isSingleMetricViewerJob: boolean;
  deleting?: boolean;
  latestTimestampSortValue?: number;
  earliestStartTimestampMs?: number;
}

export interface AuditMessage {
  job_id: string;
  msgTime: number;
  level: number;
  highestLevel: number;
  highestLevelText: string;
  text: string;
}

export type MlSummaryJobs = MlSummaryJob[];

export interface MlJobWithTimeRange extends CombinedJobWithStats {
  timeRange: {
    from: number;
    to: number;
    fromPx: number;
    toPx: number;
    fromMoment: Moment;
    toMoment: Moment;
    widthPx: number;
    label: string;
  };
}
