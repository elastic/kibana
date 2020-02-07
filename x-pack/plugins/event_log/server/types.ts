/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { Observable } from 'rxjs';
import { schema, TypeOf } from '@kbn/config-schema';

export { IEvent, IValidatedEvent, EventSchema, ECS_VERSION } from '../generated/schemas';
import { IEvent } from '../generated/schemas';

export const ConfigSchema = schema.object({
  enabled: schema.boolean({ defaultValue: true }),
  logEntries: schema.boolean({ defaultValue: false }),
  indexEntries: schema.boolean({ defaultValue: false }),
});

export type IEventLogConfig = TypeOf<typeof ConfigSchema>;
export type IEventLogConfig$ = Observable<Readonly<IEventLogConfig>>;

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

export interface IEventLogger {
  logEvent(properties: IEvent): void;
  startTiming(event: IEvent): void;
  stopTiming(event: IEvent): void;
}
