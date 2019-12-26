/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  CoreSetup,
  CoreStart,
  HttpSetup,
  Plugin,
  PluginInitializerContext,
  NotificationsStart,
} from '../../../src/core/public';

export type JobId = string;
export type JobStatus = 'completed' | 'pending' | 'processing' | 'failed';

export type HttpService = HttpSetup;
export type NotificationsService = NotificationsStart;

export interface SourceJob {
  _id: JobId;
  _source: {
    status: JobStatus;
    output: {
      max_size_reached: boolean;
      csv_contains_formulas: boolean;
    };
    payload: {
      type: string;
      title: string;
    };
  };
}

export interface JobContent {
  content: string;
}

export interface JobSummary {
  id: JobId;
  status: JobStatus;
  title: string;
  type: string;
  maxSizeReached: boolean;
  csvContainsFormulas: boolean;
}

export interface JobStatusBuckets {
  completed: JobSummary[];
  failed: JobSummary[];
}

type DownloadLink = string;
export type DownloadReportFn = (jobId: JobId) => DownloadLink;

type ManagementLink = string;
export type ManagementLinkFn = () => ManagementLink;
