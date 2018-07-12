/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { LogSummaryBucket } from '../../../../../common/log_summary';
import { TimeScale } from '../../../../../common/time';

const actionCreator = actionCreatorFactory('kibana/logging/summary');

/**
 * REPLACE_SUMMARY
 */

export interface ReplaceSummaryPayload {
  bucketSize: TimeScale;
  after: number;
  before: number;
  target: number;
}

export interface ReplaceSummaryResult {
  buckets: LogSummaryBucket[];
}

export const replaceSummary = actionCreator.async<ReplaceSummaryPayload, ReplaceSummaryResult>(
  'REPLACE_SUMMARY'
);

/**
 * EXTEND_SUMMARY
 */

export interface ExtendSummaryPayload {
  bucketSize: TimeScale;
  count: number;
  target: number;
}

export interface ExtendSummaryResult {
  buckets: LogSummaryBucket[];
}

export const extendSummaryStart = actionCreator.async<ExtendSummaryPayload, ExtendSummaryResult>(
  'EXTEND_SUMMARY_START'
);

export const extendSummaryEnd = actionCreator.async<ExtendSummaryPayload, ExtendSummaryResult>(
  'EXTEND_SUMMARY_END'
);

/**
 * CONSOLIDATE_SUMMARY
 */

export interface ConsolidateSummaryPayload {
  after: number;
  before: number;
  target: number;
}

export const consolidateSummary = actionCreator<ConsolidateSummaryPayload>('CONSOLIDATE_SUMMARY');

/**
 * REPORT_VISIBLE_SUMMARY
 */

export interface ReportVisibleSummaryPayload {
  start: number;
  end: number;
}

export const reportVisibleSummary = actionCreator<ReportVisibleSummaryPayload>(
  'REPORT_VISIBLE_SUMMARY'
);

/**
 * CONFIGURE_SUMMARY
 */

export interface ConfigureSummaryPayload {
  bucketSize: TimeScale;
  bufferSize: TimeScale;
}

export const configureSummary = actionCreator<ConfigureSummaryPayload>('CONFIGURE_SUMMARY');
