/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuditLogger, CoreAuditService } from '@kbn/core/server';
import type { MlClient, MlClientParams } from './types';
import {
  getADJobIdsFromRequest,
  getDFAJobIdsFromRequest,
  getDatafeedIdsFromRequest,
  getModelIdsFromRequest,
} from './ml_client';

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
  | 'delete_calendar'
  | 'put_calendar_job'
  | 'delete_calendar_job'
  | 'post_calendar_events'
  | 'delete_calendar_event'
  | 'put_filter'
  | 'update_filter'
  | 'delete_filter'
  | 'forecast'
  | 'delete_forecast';

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

const APPLICATION = 'elastic/ml';

export class MlAuditLogger {
  private auditLogger: AuditLogger;
  constructor(audit: CoreAuditService, request?: KibanaRequest) {
    this.auditLogger = request ? audit.asScoped(request) : audit.withoutRequest;
  }

  public async wrapTask<T, P extends MlClientParams>(task: () => T, taskType: TaskType, p: P) {
    try {
      const resp = await task();
      this.logSuccess(taskType, p);
      return resp;
    } catch (error) {
      this.logFailure(taskType, p);
      throw error;
    }
  }

  public logMessage(message: string) {
    this.auditLogger.log({
      message,
      labels: {
        application: APPLICATION,
      },
    });
  }

  private logSuccess(taskType: TaskType, p: MlClientParams) {
    const entry = this.createLogEntry(taskType, p, true);
    this.auditLogger.log(entry);
  }
  private logFailure(taskType: TaskType, p: MlClientParams) {
    const entry = this.createLogEntry(taskType, p, false);
    this.auditLogger.log(entry);
  }

  private createLogEntry(taskType: TaskType, p: MlClientParams, success: boolean) {
    return {
      event: { action: taskType, outcome: success ? 'success' : 'failure' },
      message: this.createMessage(taskType, p),
      labels: {
        application: APPLICATION,
      },
    };
  }

  private createMessage(taskType: TaskType, p: MlClientParams): string {
    switch (taskType) {
      /* Anomaly Detection */
      case 'put_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return `Creating anomaly detection job ${jobId}`;
      }
      case 'delete_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return `Deleting anomaly detection job ${jobId}`;
      }
      case 'delete_model_snapshot': {
        const [jobId] = getADJobIdsFromRequest(p);
        const [params] = p as Parameters<MlClient['deleteModelSnapshot']>;
        const snapshotId = params.snapshot_id;
        return `Deleting model snapshot ${snapshotId} from job ${jobId}`;
      }
      case 'open_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return `Opening anomaly detection job ${jobId}`;
      }
      case 'close_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return `Closing anomaly detection job ${jobId}`;
      }
      case 'update_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return `Updating anomaly detection job ${jobId}`;
      }
      case 'reset_ad_job': {
        const [jobId] = getADJobIdsFromRequest(p);
        return `Resetting anomaly detection job ${jobId}`;
      }
      case 'revert_ad_snapshot': {
        const [jobId] = getADJobIdsFromRequest(p);
        const [params] = p as Parameters<MlClient['revertModelSnapshot']>;
        const snapshotId = params.snapshot_id;
        return `Reverting anomaly detection snapshot ${snapshotId} in job ${jobId}`;
      }
      case 'put_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        const [jobId] = getADJobIdsFromRequest(p);
        return `Creating anomaly detection datafeed ${datafeedId} for job ${jobId}`;
      }
      case 'delete_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return `Deleting anomaly detection datafeed ${datafeedId}`;
      }
      case 'start_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return `Starting anomaly detection datafeed ${datafeedId}`;
      }
      case 'stop_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return `Stopping anomaly detection datafeed ${datafeedId}`;
      }
      case 'update_ad_datafeed': {
        const [datafeedId] = getDatafeedIdsFromRequest(p);
        return `Updating anomaly detection datafeed ${datafeedId}`;
      }
      case 'put_calendar': {
        const [params] = p as Parameters<MlClient['putCalendar']>;
        const calendarId = params.calendar_id;
        // @ts-expect-error body is optional
        const jobIds = (params.body ?? params).job_ids;
        return `Creating calendar ${calendarId} ${jobIds ? `with job(s) ${jobIds}` : ''}`;
      }
      case 'delete_calendar': {
        const [params] = p as Parameters<MlClient['deleteCalendar']>;
        const calendarId = params.calendar_id;
        return `Deleting calendar ${calendarId}`;
      }
      case 'put_calendar_job': {
        const [params] = p as Parameters<MlClient['putCalendarJob']>;
        const calendarId = params.calendar_id;
        const jobIds = params.job_id;
        return `Adding job(s) ${jobIds} to calendar ${calendarId}`;
      }
      case 'delete_calendar_job': {
        const [params] = p as Parameters<MlClient['deleteCalendarJob']>;
        const calendarId = params.calendar_id;
        const jobIds = params.job_id;
        return `Removing job(s) ${jobIds} from calendar ${calendarId}`;
      }
      case 'post_calendar_events': {
        const [params] = p as Parameters<MlClient['postCalendarEvents']>;
        const calendarId = params.calendar_id;
        // @ts-expect-error body is optional
        const eventsCount = (params.body ?? params).events;
        return `Adding ${eventsCount} event(s) to calendar ${calendarId}`;
      }
      case 'delete_calendar_event': {
        const [params] = p as Parameters<MlClient['deleteCalendarEvent']>;
        const calendarId = params.calendar_id;
        const eventId = params.event_id;
        return `Removing event(s) ${eventId} from calendar ${calendarId}`;
      }
      case 'put_filter': {
        const [params] = p as Parameters<MlClient['putFilter']>;
        const filterId = params.filter_id;
        return `Creating filter ${filterId}`;
      }
      case 'update_filter': {
        const [params] = p as Parameters<MlClient['updateFilter']>;
        const filterId = params.filter_id;
        return `Updating filter ${filterId}`;
      }
      case 'delete_filter': {
        const [params] = p as Parameters<MlClient['deleteFilter']>;
        const filterId = params.filter_id;
        return `Deleting filter ${filterId}`;
      }
      case 'forecast': {
        const [jobId] = getADJobIdsFromRequest(p);
        return `Forecasting for job ${jobId}`;
      }
      case 'delete_forecast': {
        const [params] = p as Parameters<MlClient['deleteForecast']>;
        const forecastId = params.forecast_id;
        const [jobId] = getADJobIdsFromRequest(p);
        return `Deleting forecast ${forecastId} for job ${jobId}`;
      }

      /* Data Frame Analytics */
      case 'put_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return `Creating data frame analytics job ${analyticsId}`;
      }
      case 'delete_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return `Deleting data frame analytics job ${analyticsId}`;
      }
      case 'start_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return `Starting data frame analytics job ${analyticsId}`;
      }
      case 'stop_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return `Stopping data frame analytics job ${analyticsId}`;
      }
      case 'update_dfa_job': {
        const [analyticsId] = getDFAJobIdsFromRequest(p);
        return `Updating data frame analytics job ${analyticsId}`;
      }

      /* Trained Models */
      case 'put_trained_model': {
        const [modelId] = getModelIdsFromRequest(p);
        return `Creating trained model ${modelId}`;
      }
      case 'delete_trained_model': {
        const [modelId] = getModelIdsFromRequest(p);
        return `Deleting trained model ${modelId}`;
      }
      case 'start_trained_model_deployment': {
        const [modelId] = getModelIdsFromRequest(p);
        return `Starting trained model deployment for model ${modelId}`;
      }
      case 'stop_trained_model_deployment': {
        const [modelId] = getModelIdsFromRequest(p);
        return `Stopping trained model deployment for model ${modelId}`;
      }
      case 'update_trained_model_deployment': {
        const [modelId] = getModelIdsFromRequest(p);
        return `Updating trained model deployment for model ${modelId}`;
      }
      case 'infer_trained_model': {
        const [modelId] = getModelIdsFromRequest(p);
        return `Inferring trained model ${modelId}`;
      }

      default:
        return `Unknown ML task ${taskType}`;
    }
  }
}
