/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuditLogger, CoreAuditService } from '@kbn/core/server';
import type { MlClient, MlClientParams } from './lib/ml_client/types';
import {
  getADJobIdsFromRequest,
  getDFAJobIdsFromRequest,
  getDatafeedIdsFromRequest,
} from './lib/ml_client/ml_client';

type TaskType =
  | 'put_ad_job'
  | 'delete_ad_job'
  | 'delete_model_snapshot'
  | 'open_ad_job'
  | 'close_ad_job'
  | 'update_ad_job'
  | 'reset_ad_job'
  | 'revert_ad_snapshot'
  | 'put_ad_datafeed'
  | 'delete_ad_datafeed'
  | 'start_ad_datafeed'
  | 'stop_ad_datafeed'
  | 'update_ad_datafeed'
  | 'put_dfa_job'
  | 'delete_dfa_job'
  | 'start_dfa_job'
  | 'stop_dfa_job'
  | 'get_ad_jobs'
  | 'get_dfa_jobs';

export class MlAuditLogger {
  private auditLogger: AuditLogger;
  constructor(audit: CoreAuditService, request?: KibanaRequest) {
    this.auditLogger = request ? audit.asScoped(request) : audit.withoutRequest;
  }

  public log(message: string) {
    this.auditLogger.log({ message, labels: { application: 'elastic/ml' } });
  }

  private logSuccess(logEntry: any) {
    this.auditLogger.log({ ...logEntry, labels: { application: 'elastic/ml' } });
  }

  private logFailure(logEntry: any) {
    this.auditLogger.log({ ...logEntry, labels: { application: 'elastic/ml' } });
  }

  public async wrapTask<T, P extends MlClientParams>(task: () => T, taskType: TaskType, p: P) {
    const logEntry = this.createLogEntry(taskType, p);
    try {
      const resp = await task();
      this.logSuccess(logEntry);
      return resp;
    } catch (error) {
      this.logFailure(logEntry);
      throw error;
    }
  }

  private createLogEntry(taskName: string, p: MlClientParams) {
    switch (taskName) {
      case 'put_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Creating anomaly detection job ${jobId}` };
      }
      case 'delete_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Deleting anomaly detection job ${jobId}` };
      }
      case 'delete_model_snapshot': {
        const [jobId] = getADJobIdsFromRequest(p);
        const snapshotId = getSnapshotIdFromBody(p as DeleteModelSnapshotParams);
        return { message: `Deleting model snapshot ${snapshotId} from job ${jobId}` };
      }
      case 'open_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Opening anomaly detection job ${jobId}` };
      }
      case 'close_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Closing anomaly detection job ${jobId}` };
      }
      case 'update_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Updating anomaly detection job ${jobId}` };
      }
      case 'reset_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Resetting anomaly detection job ${jobId}` };
      }
      case 'revert_ad_snapshot': {
        const [jobId] = getADJobIdsFromRequest(p);
        const snapshotId = getSnapshotIdFromBody(p as RevertModelSnapshotParams);
        return { message: `Reverting anomaly detection snapshot ${snapshotId} in job ${jobId}` };
      }
      case 'put_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        const [jobId] = getADJobIdsFromRequest(p);
        return { message: `Creating anomaly detection datafeed ${datafeedId} for job ${jobId}` };
      }
      case 'delete_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return { message: `Deleting anomaly detection datafeed ${datafeedId}` };
      }
      case 'start_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return { message: `Starting anomaly detection datafeed ${datafeedId}` };
      }
      case 'stop_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return { message: `Stopping anomaly detection datafeed ${datafeedId}` };
      }
      case 'update_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return { message: `Updating anomaly detection datafeed ${datafeedId}` };
      }
      case 'put_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return { message: `Creating data frame analytics job ${analyticsId}` };
      }
      case 'delete_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return { message: `Deleting data frame analytics job ${analyticsId}` };
      }
      case 'start_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return { message: `Starting data frame analytics job ${analyticsId}` };
      }
      case 'stop_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return { message: `Stopping data frame analytics job ${analyticsId}` };
      }
      case 'get_ad_jobs': {
        return { message: 'Getting anomaly detection jobs' };
      }
      case 'get_dfa_jobs': {
        return { message: 'Getting data frame analytics jobs' };
      }
      default: {
        return { message: `Unknown task ${taskName}` };
      }
    }
  }
}

type DeleteModelSnapshotParams = Parameters<MlClient['deleteModelSnapshot']>;
type RevertModelSnapshotParams = Parameters<MlClient['revertModelSnapshot']>;

function getSnapshotIdFromBody(
  p: DeleteModelSnapshotParams | RevertModelSnapshotParams
): string | undefined {
  const [params] = p;
  return params?.snapshot_id;
}
