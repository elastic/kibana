/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Moment } from 'moment';

import { CombinedJob, CombinedJobWithStats } from './combined_job';
import { MlAnomalyDetectionAlertRule } from '../alerts';
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
  isNotSingleMetricViewerJobMessage?: string;
  deleting?: boolean;
  latestTimestampSortValue?: number;
  earliestStartTimestampMs?: number;
  awaitingNodeAssignment: boolean;
  alertingRules?: MlAnomalyDetectionAlertRule[];
}

export interface AuditMessage {
  job_id: string;
  msgTime: number;
  level: string;
  highestLevel: string;
  highestLevelText: string;
  text: string;
}

export type MlSummaryJobs = MlSummaryJob[];

export interface MlJobWithTimeRange extends CombinedJobWithStats {
  id: string;
  isRunning?: boolean;
  isNotSingleMetricViewerJobMessage?: string;
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
