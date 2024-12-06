/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { LocatorDefinition } from '@kbn/share-plugin/common';
import { LocatorClient } from '@kbn/share-plugin/common/url_service';
import { TraceLogsLocatorParams } from './types';

import { getTraceQuery, getTimeRangeEndFromTime, getTimeRangeStartFromTime } from './helpers';

export const TRACE_LOGS_LOCATOR_ID = 'TRACE_LOGS_LOCATOR';

export class TraceLogsLocatorDefinition implements LocatorDefinition<TraceLogsLocatorParams> {
  public readonly id = TRACE_LOGS_LOCATOR_ID;

  constructor(private readonly locators: LocatorClient) {}

  public readonly getLocation = async (params: TraceLogsLocatorParams) => {
    const discoverAppLocator = this.locators.get<DiscoverAppLocatorParams>('DISCOVER_APP_LOCATOR');
    if (!discoverAppLocator) {
      throw new Error('Locator "DISCOVER_APP_LOCATOR" not found');
    }

    const { time } = params;
    return discoverAppLocator.getLocation({
      dataViewSpec: {
        title: 'logs-*', // Contrary to its name, this param sets the index pattern
        timeFieldName: '@timestamp',
      },
      query: getTraceQuery(params),
      ...(time
        ? {
            timeRange: {
              from: getTimeRangeStartFromTime(time),
              to: getTimeRangeEndFromTime(time),
            },
          }
        : {}),
    });
  };
}
