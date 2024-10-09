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
  getModelIdsFromRequest,
} from './lib/ml_client/ml_client';

type TaskTypeAD =
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
  | 'put_calendar'
  | 'put_calendar_job'
  | 'post_calendar_events'
  | 'put_filter'
  | 'update_filter';

type TaskTypeDFA =
  | 'put_dfa_job'
  | 'delete_dfa_job'
  | 'start_dfa_job'
  | 'stop_dfa_job'
  | 'update_dfa_job';

type TaskTypeNLP =
  | 'put_trained_model'
  | 'delete_trained_model'
  | 'start_trained_model_deployment'
  | 'stop_trained_model_deployment'
  | 'update_trained_model_deployment'
  | 'infer_trained_model';

type TaskType = TaskTypeAD | TaskTypeDFA | TaskTypeNLP;

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
      /* Anomaly Detection */
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
        const snapshotId = getSnapshotIdFromRequest(
          p as Parameters<MlClient['deleteModelSnapshot']>
        );
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
        const snapshotId = getSnapshotIdFromRequest(
          p as Parameters<MlClient['revertModelSnapshot']>
        );
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
      case 'put_calendar': {
        const [params] = p as Parameters<MlClient['putCalendar']>;
        const calendarId = params.calendar_id;
        // @ts-expect-error body is optional
        const jobIds = (params.body ?? params).job_ids;
        return {
          message: `Creating calendar ${calendarId} ${
            jobIds ? `with job(s) ${jobIds.join()}` : ''
          }`,
        };
      }
      case 'put_calendar_job': {
        const [params] = p as Parameters<MlClient['putCalendarJob']>;
        const calendarId = params.calendar_id;
        const jobIds = params.job_id;
        return {
          message: `Adding job(s) ${jobIds} to calendar ${calendarId}`,
        };
      }
      case 'post_calendar_events': {
        const [params] = p as Parameters<MlClient['postCalendarEvents']>;
        const calendarId = params.calendar_id;
        // @ts-expect-error body is optional
        const eventsCount = (params.body ?? params).events;
        return {
          message: `Adding ${eventsCount} event(s) to calendar ${calendarId}`,
        };
      }
      case 'put_filter': {
        const [params] = p as Parameters<MlClient['putFilter']>;
        const filterId = params.filter_id;
        return { message: `Creating filter ${filterId}` };
      }
      case 'update_filter': {
        const [params] = p as Parameters<MlClient['updateFilter']>;
        const filterId = params.filter_id;
        return { message: `Updating filter ${filterId}` };
      }

      /* Data Frame Analytics */
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
      case 'update_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return { message: `Updating data frame analytics job ${analyticsId}` };
      }

      /* Trained Models */
      case 'put_trained_model': {
        const [modelId] = getModelIdsFromRequest(p);
        return { message: `Creating trained model ${modelId}` };
      }
      case 'delete_trained_model': {
        const [modelId] = getModelIdsFromRequest(p);
        return { message: `Deleting trained model ${modelId}` };
      }
      case 'start_trained_model_deployment': {
        const [modelId] = getModelIdsFromRequest(p);
        return { message: `Starting trained model deployment for model ${modelId}` };
      }
      case 'stop_trained_model_deployment': {
        const [modelId] = getModelIdsFromRequest(p);
        return { message: `Stopping trained model deployment for model ${modelId}` };
      }
      case 'update_trained_model_deployment': {
        const [modelId] = getModelIdsFromRequest(p);
        return { message: `Updating trained model deployment for model ${modelId}` };
      }
      case 'infer_trained_model': {
        const [modelId] = getModelIdsFromRequest(p);
        return { message: `Inferring trained model ${modelId}` };
      }

      default: {
        return { message: `Unknown ML task ${taskName}` };
      }
    }
  }
}

function getSnapshotIdFromRequest([params]:
  | Parameters<MlClient['deleteModelSnapshot']>
  | Parameters<MlClient['revertModelSnapshot']>): string | undefined {
  return params?.snapshot_id;
}
