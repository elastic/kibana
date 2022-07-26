/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// See SharedTogo::Crawler::Status for details on how these are generated
export enum CrawlerStatus {
  Pending = 'pending',
  Suspended = 'suspended',
  Starting = 'starting',
  Running = 'running',
  Suspending = 'suspending',
  Canceling = 'canceling',
  Success = 'success',
  Failed = 'failed',
  Canceled = 'canceled',
  Skipped = 'skipped',
}

export interface CrawlRequest {
  id: string;
  configuration_oid: string;
  status: CrawlerStatus;
}
export interface Crawler {
  id: string;
  index_name: string;
  most_recent_crawl_request_status?: CrawlerStatus;
}
