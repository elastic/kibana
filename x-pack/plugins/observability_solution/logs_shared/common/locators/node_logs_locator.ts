/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { LocatorClient, LocatorDefinition } from '@kbn/share-plugin/common/url_service';

import { NodeLogsLocatorParams } from './types';
import { getNodeQuery, getTimeRangeStartFromTime, getTimeRangeEndFromTime } from './helpers';

export const NODE_LOGS_LOCATOR_ID = 'NODE_LOGS_LOCATOR';

export class NodeLogsLocatorDefinition implements LocatorDefinition<NodeLogsLocatorParams> {
  public readonly id = NODE_LOGS_LOCATOR_ID;

  constructor(private readonly locators: LocatorClient) {}

  public readonly getLocation = async (params: NodeLogsLocatorParams) => {
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
      query: getNodeQuery(params),
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
