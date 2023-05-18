/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { LogViewReference } from '../../common/log_views';
import type { TimeRange } from '../../common/time';
import type { InfraClientCoreSetup } from '../types';

const LOGS_LOCATOR_ID = 'LOGS_LOCATOR';

export interface LogsLocatorParams extends SerializableRecord {
  /** Defines log position */
  time?: number;
  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: TimeRange;
  filter?: string;
  logView?: LogViewReference;
}

export type LogsLocator = LocatorPublic<LogsLocatorParams>;

export interface LogsLocatorDependencies {
  core: InfraClientCoreSetup;
}

export class LogsLocatorDefinition implements LocatorDefinition<LogsLocatorParams> {
  public readonly id = LOGS_LOCATOR_ID;

  constructor(protected readonly deps: LogsLocatorDependencies) {}

  public readonly getLocation = async (params: LogsLocatorParams) => {
    const { createSearchString } = await import('./helpers');

    const searchString = createSearchString(params);

    return {
      app: 'logs',
      path: `/stream?${searchString}`,
      state: {},
    };
  };
}
