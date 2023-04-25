/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { DISCOVER_APP_TARGET } from '../../common/constants';

const LOGS_LOCATOR_ID = 'LOGS_LOCATOR';

export interface LogsLocatorParams extends SerializableRecord {
  /** Defines log position */
  time: number;
  /** Defines from timestamp, defaults to one hour before time property */
  from?: number;
  /** Defines to timestamp, defaults to one hour after time property */
  to?: number;
  filter?: string;
  logViewId?: string;
}

export type LogsLocator = LocatorPublic<LogsLocatorParams>;

export class LogsLocatorDefinition implements LocatorDefinition<LogsLocatorParams> {
  public readonly id = LOGS_LOCATOR_ID;

  constructor(protected readonly appTarget: string) {}

  public readonly getLocation = async (params: LogsLocatorParams) => {
    const { parseSearchString } = await import('./helpers');
    const searchString = parseSearchString(params);

    if (this.appTarget === DISCOVER_APP_TARGET) {
      // TODO: check serverless flag
      // if enabled, use discover locator to return a path to discover
      // if disabled continue with the normal flow
    }

    return {
      app: 'logs',
      path: `/stream?${searchString}`,
      state: {},
    };
  };
}
