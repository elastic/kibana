/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { SerializableRecord } from '@kbn/utility-types';
import type { InfraClientCoreSetup, QueryTimeRange } from '../types';
import { DISCOVER_APP_TARGET } from '../../common/constants';

const LOGS_LOCATOR_ID = 'LOGS_LOCATOR';

export interface LogsLocatorParams extends SerializableRecord {
  /** Defines log position */
  time?: number;
  /**
   * Optionally set the time range in the time picker.
   */
  timeRange?: QueryTimeRange;
  filter?: string;
  logViewId?: string;
}

export type LogsLocator = LocatorPublic<LogsLocatorParams>;

export interface LogsLocatorDependencies {
  core: InfraClientCoreSetup;
  appTarget: string;
}

export class LogsLocatorDefinition implements LocatorDefinition<LogsLocatorParams> {
  public readonly id = LOGS_LOCATOR_ID;

  constructor(protected readonly deps: LogsLocatorDependencies) {}

  public readonly getLocation = async (params: LogsLocatorParams) => {
    const { parseSearchString, getLocationToDiscover } = await import('./helpers');

    if (this.deps.appTarget === DISCOVER_APP_TARGET) {
      return await getLocationToDiscover({ core: this.deps.core, ...params });
    }

    const searchString = parseSearchString(params);

    return {
      app: 'logs',
      path: `/stream?${searchString}`,
      state: {},
    };
  };
}
