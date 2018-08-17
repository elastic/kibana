/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import actionCreatorFactory from 'typescript-fsa';

import { loadSummaryActionCreators } from './load_operation';

const actionCreator = actionCreatorFactory('x-pack/infra/remote/log_summary');

/**
 * load operation
 */

export const loadSummary = loadSummaryActionCreators.resolve;

/**
 * REPORT_VISIBLE_SUMMARY
 */

export interface ReportVisibleSummaryPayload {
  start: number;
  end: number;
  bucketsOnPage: number;
  pagesBeforeStart: number;
  pagesAfterEnd: number;
}

export const reportVisibleSummary = actionCreator<ReportVisibleSummaryPayload>(
  'REPORT_VISIBLE_SUMMARY'
);

/**
 * CONFIGURE_SUMMARY
 */

export interface ConfigureSummaryPayload {
  intervalSize: number;
}

export const configureSummary = actionCreator<ConfigureSummaryPayload>('CONFIGURE_SUMMARY');
