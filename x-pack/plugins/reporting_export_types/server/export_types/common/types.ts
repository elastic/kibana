/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { KibanaRequest } from '@kbn/core-http-server';
import { CancellationToken, TaskRunResult } from '@kbn/reporting-common';
import { ReportingCore } from '@kbn/reporting-plugin/server';
import { ReportTaskParams } from '@kbn/reporting-plugin/server/lib/tasks';
import { BaseParams, BasePayload } from '@kbn/reporting-plugin/server/types';
import type { Writable } from 'stream';
import { Logger } from '@kbn/core/server';
import { ReportingExportTypesCore } from '../../core';
import { ReportingRequestHandlerContext } from '../../routes';

/**
 * Internal Types
 */

// default fn type for CreateJobFnFactory
export type CreateJobFn<JobParamsType = BaseParams, JobPayloadType = BasePayload> = (
  jobParams: JobParamsType,
  context: ReportingRequestHandlerContext,
  req: KibanaRequest
) => Promise<Omit<JobPayloadType, 'headers' | 'spaceId'>>;

// default fn type for RunTaskFnFactory
export type RunTaskFn<TaskPayloadType = BasePayload> = (
  jobId: string,
  payload: ReportTaskParams<TaskPayloadType>['payload'],
  cancellationToken: CancellationToken,
  stream: Writable
) => Promise<TaskRunResult>;
export type CreateJobFnFactory<CreateJobFnType> = (
  reporting: ReportingExportTypesCore | ReportingCore,
  logger: Logger
) => CreateJobFnType;

export type RunTaskFnFactory<RunTaskFnType> = (
  reporting: ReportingExportTypesCore | ReportingCore,
  logger: Logger
) => RunTaskFnType;

export interface ExportTypeDefinition<CreateJobFnType = CreateJobFn, RunTaskFnType = RunTaskFn> {
  id: string;
  name: string;
  jobType: string;
  jobContentEncoding?: string;
  jobContentExtension: string;
  createJobFnFactory: CreateJobFnFactory<CreateJobFnType> | null; // csv immediate job does not have a "create" phase
  runTaskFnFactory: RunTaskFnFactory<RunTaskFnType>;
  validLicenses: string[];
}
