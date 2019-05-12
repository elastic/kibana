/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

declare interface JobService {
  saveNewJob(job: any): Promise<any>;
  openJob(jobId: string): Promise<any>;
  saveNewDatafeed(datafeedConfig: any, jobId: string): Promise<any>;
  startDatafeed(datafeedId: string, jobId: string, start: number, end: number): Promise<any>;
}

export const mlJobService: JobService;
