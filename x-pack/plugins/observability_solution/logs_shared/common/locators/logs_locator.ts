/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALL_DATASETS_LOCATOR_ID, AllDatasetsLocatorParams } from '@kbn/deeplinks-observability';
import { LocatorDefinition } from '@kbn/share-plugin/common';
import { LocatorClient } from '@kbn/share-plugin/common/url_service';

import { LogsLocatorParams } from './types';
import { getLogsQuery, getTimeRangeEndFromTime, getTimeRangeStartFromTime } from './helpers';

export const LOGS_LOCATOR_ID = 'LOGS_LOCATOR';

export class LogsLocatorDefinition implements LocatorDefinition<LogsLocatorParams> {
  public readonly id = LOGS_LOCATOR_ID;

  constructor(private readonly locators: LocatorClient) {}

  public readonly getLocation = async (params: LogsLocatorParams) => {
    const allDatasetsLocator =
      this.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID)!;
    const { time } = params;
    return allDatasetsLocator.getLocation({
      query: getLogsQuery(params),
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
