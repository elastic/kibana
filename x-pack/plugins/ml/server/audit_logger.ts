/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Ml from '@elastic/elasticsearch/lib/api/api/ml';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuditLogger, CoreAuditService } from '@kbn/core/server';

type TaskType =
  | 'put_ad_job'
  | 'delete_ad_job'
  | 'open_ad_job'
  | 'close_ad_job'
  | 'update_ad_job'
  | 'reset_ad_job'
  | 'revert_ad_job'
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

const TASKS = new Map<TaskType, string>([
  ['put_ad_job', 'Creating anomaly detection job'],
  ['delete_ad_job', 'Deleting anomaly detection job'],
  ['open_ad_job', 'Opening anomaly detection job'],
  ['close_ad_job', 'Closing anomaly detection job'],
  ['update_ad_job', 'Updating anomaly detection job'],
  ['reset_ad_job', 'Resetting anomaly detection job'],
  ['revert_ad_job', 'Reverting anomaly detection job'],
  ['put_ad_datafeed', 'Creating anomaly detection datafeed'],
  ['delete_ad_datafeed', 'Deleting anomaly detection datafeed'],
  ['start_ad_datafeed', 'Starting anomaly detection datafeed'],
  ['stop_ad_datafeed', 'Stopping anomaly detection datafeed'],
  ['update_ad_datafeed', 'Updating anomaly detection datafeed'],
  ['put_dfa_job', 'Creating data frame analytics job'],
  ['delete_dfa_job', 'Deleting data frame analytics job'],
  ['start_dfa_job', 'Starting data frame analytics job'],
  ['stop_dfa_job', 'Stopping data frame analytics job'],
  ['get_ad_jobs', 'Getting anomaly detection jobs'],
  ['get_dfa_jobs', 'Getting data frame analytics jobs'],
]);

type ClientTasks = Ml['putJob'];
type ClientTasksParam = Parameters<Ml['putJob']>;

export class MlAuditLogger {
  private auditLogger: AuditLogger;
  constructor(audit: CoreAuditService, request?: KibanaRequest) {
    this.auditLogger = request ? audit.asScoped(request) : audit.withoutRequest;
  }

  public log(message: string) {
    this.auditLogger.log({ message, labels: { application: 'elastic/ml' } });
  }

  public async wrapTask<T>(task: () => T, taskType: TaskType, id: string) {
    const taskName = TASKS.get(taskType) ?? 'Unknown ML task';
    try {
      const resp = await task();
      this.log(`${taskName} ${id}`);
      return resp;
    } catch (error) {
      this.log(`Failed ${taskName} ${id}`);
      throw error;
    }
  }

  // public async wrapTaskTest<T>(
  //   task: ClientTasks,
  //   args: ClientTasksParam,
  //   taskType: TaskType,
  //   id: string
  // ) {
  //   const taskName = TASKS.get(taskType) ?? 'Unknown ML task';
  //   try {
  //     const resp = await task(args);
  //     this.log(`${taskName} ${id}`);
  //     return resp;
  //   } catch (error) {
  //     this.log(`Failed ${taskName} ${id}`);
  //     throw error;
  //   }
  // }
}
