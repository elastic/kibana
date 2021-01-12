/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { DataStream } from './index';

/**
 * The configuration options for generating an event.
 */
export interface EventOptions {
  timestamp?: number;
  entityID?: string;
  parentEntityID?: string;
  eventType?: string | string[];
  eventCategory?: string | string[];
  processName?: string;
  ancestry?: string[];
  ancestryArrayLimit?: number;
  pid?: number;
  parentPid?: number;
  extensions?: object;
  eventsDataStream?: DataStream;
}
