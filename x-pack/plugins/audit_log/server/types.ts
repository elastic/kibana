/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ObjectType, TypeOf } from '@kbn/config-schema';

export type IAuditRecord = TypeOf<ObjectType>;

export interface IAuditLog {
  log(data: IAuditRecord): Promise<void>;
  search(): Promise<IAuditRecord[]>;
}

export interface IRegisterAuditLogOptions {
  id: string;
  recordSchema: ObjectType;
}

export interface IGetAuditLogOptions {
  id: string;
}

export interface IAuditLogPluginAPI {
  registerAuditLog(options: IRegisterAuditLogOptions): IAuditLog;
  getAuditLog(options: IGetAuditLogOptions): IAuditLog;
  hasAuditLog(options: IGetAuditLogOptions): boolean;
}
