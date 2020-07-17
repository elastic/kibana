/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { schema, TypeOf } from '@kbn/config-schema';
import { KibanaRequest } from 'src/core/server';

export { IEvent, IValidatedEvent, EventSchema, ECS_VERSION } from '../generated/schemas';
import { IEvent } from '../generated/schemas';
import { FindOptionsType } from './event_log_client';
import { QueryEventsBySavedObjectResult } from './es/cluster_client_adapter';

export const SAVED_OBJECT_REL_PRIMARY = 'primary';

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  logEntries: schema.boolean({ defaultValue: false }),
  indexEntries: schema.boolean({ defaultValue: true }),
});

export type IEventLogConfig = TypeOf<typeof ConfigSchema>;
export type IEventLogConfig$ = Observable<Readonly<IEventLogConfig>>;

declare module 'src/core/server' {
  interface RequestHandlerContext {
    eventLog?: {
      getEventLogClient: () => IEventLogClient;
    };
  }
}

// the object exposed by plugin.setup()
export interface IEventLogService {
  isEnabled(): boolean;
  isLoggingEntries(): boolean;
  isIndexingEntries(): boolean;
  registerProviderActions(provider: string, actions: string[]): void;
  isProviderActionRegistered(provider: string, action: string): boolean;
  getProviderActions(): Map<string, Set<string>>;

  getLogger(properties: IEvent): IEventLogger;
}

export interface IEventLogClientService {
  getClient(request: KibanaRequest): IEventLogClient;
}

export interface IEventLogClient {
  findEventsBySavedObject(
    type: string,
    id: string,
    options?: Partial<FindOptionsType>
  ): Promise<QueryEventsBySavedObjectResult>;
}

export interface IEventLogger {
  logEvent(properties: IEvent): void;
  startTiming(event: IEvent): void;
  stopTiming(event: IEvent): void;
}
