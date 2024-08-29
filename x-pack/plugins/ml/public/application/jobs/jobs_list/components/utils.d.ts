/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApplicationStart, ToastsStart } from '@kbn/core/public';

import type { DATAFEED_STATE } from '../../../../../common/constants/states';
import type {
  CombinedJobWithStats,
  MlSummaryJob,
} from '../../../../../common/types/anomaly_detection_jobs';
import type { MlApiServices } from '../../../services/ml_api_service';

export function loadFullJob(
  mlApiServices: MlApiServices,
  jobId: string
): Promise<CombinedJobWithStats>;
export function loadJobForCloning(mlApiServices: MlApiServices, jobId: string): Promise<any>;
export function isStartable(jobs: CombinedJobWithStats[]): boolean;
export function isClosable(jobs: CombinedJobWithStats[]): boolean;
export function isResettable(jobs: CombinedJobWithStats[]): boolean;
export function forceStartDatafeeds(
  toastNotifications: ToastsStart,
  mlApiServices: MlApiServices,
  jobs: CombinedJobWithStats[],
  start: number | undefined,
  end: number | undefined,
  finish?: () => void
): Promise<void>;
export function stopDatafeeds(
  toastNotifications: ToastsStart,
  mlApiServices: MlApiServices,
  jobs: CombinedJobWithStats[] | MlSummaryJob[],
  finish?: () => void
): Promise<void>;
export function showResults(
  toastNotifications: ToastsStart,
  resp: any,
  action: DATAFEED_STATE
): void;
export function cloneJob(
  toastNotifications: ToastsStart,
  application: ApplicationStart,
  mlApiServices: MlApiServices,
  jobId: string
): Promise<void>;
export function closeJobs(
  toastNotifications: ToastsStart,
  mlApiServices: MlApiServices,
  jobs: CombinedJobWithStats[] | MlSummaryJob[],
  finish?: () => void
): Promise<void>;
export function deleteJobs(
  toastNotifications: ToastsStart,
  mlApiServices: MlApiServices,
  jobs: Array<{ id: string }>,
  deleteUserAnnotations?: boolean,
  deleteAlertingRules?: boolean,
  finish?: () => void
): Promise<void>;
export function resetJobs(
  toastNotifications: ToastsStart,
  mlApiServices: MlApiServices,
  jobIds: string[],
  deleteUserAnnotations?: boolean,
  finish?: () => void
): Promise<void>;
export function filterJobs(
  jobs: CombinedJobWithStats[],
  clauses: Array<{ field: string; match: string; type: string; value: any }>
): CombinedJobWithStats[];
export function jobProperty(job: CombinedJobWithStats, prop: string): any;
export function jobTagFilter(jobs: CombinedJobWithStats[], value: string): CombinedJobWithStats[];
