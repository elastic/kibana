/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { IEvent, IEventLogger } from './types';

export function createEventLoggerMock(): IEventLogger {
  return {
    logEvent(eventProperties: IEvent): void {},
    startTiming(event: IEvent): void {},
    stopTiming(event: IEvent): void {},
  };
}
