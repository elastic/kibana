/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALL_DATASETS_LOCATOR_ID,
  AllDatasetsLocatorParams,
  TRACE_LOGS_LOCATOR_ID,
  TraceLogsLocatorParams,
} from '@kbn/deeplinks-observability';
import { LocatorDefinition } from '@kbn/share-plugin/common';
import { LocatorClient } from '@kbn/share-plugin/common/url_service';
import { INFRA_LOGS_LOCATOR_ID } from './infra';
import { LogsLocatorParams } from './types';

import { getTraceQuery, getTimeRangeEndFromTime, getTimeRangeStartFromTime } from './helpers';

export class TraceLogsLocatorDefinition implements LocatorDefinition<TraceLogsLocatorParams> {
  public readonly id = TRACE_LOGS_LOCATOR_ID;

  constructor(private readonly locators: LocatorClient) {}

  public readonly getLocation = async (params: TraceLogsLocatorParams) => {
    const { traceId, time } = params;

    const infraLogsLocator = this.locators.get<LogsLocatorParams>(INFRA_LOGS_LOCATOR_ID);
    if (infraLogsLocator) {
      return infraLogsLocator.getLocation({
        filter: getTraceQuery(traceId).query,
        time,
      });
    }

    const allDatasetsLocator =
      this.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID)!;
    return allDatasetsLocator.getLocation({
      query: getTraceQuery(traceId),
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
