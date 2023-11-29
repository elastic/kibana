/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  AllDatasetsLocatorParams,
  ALL_DATASETS_LOCATOR_ID,
  NodeLogsLocatorParams,
  NODE_LOGS_LOCATOR_ID,
} from '@kbn/deeplinks-observability/locators';
import { LocatorClient, LocatorDefinition } from '@kbn/share-plugin/common/url_service';

import { INFRA_NODE_LOGS_LOCATOR_ID, InfraNodeLogsLocatorParams } from './infra';
import { getNodeQuery, getTimeRangeStartFromTime, getTimeRangeEndFromTime } from './helpers';

export class NodeLogsLocatorDefinition implements LocatorDefinition<NodeLogsLocatorParams> {
  public readonly id = NODE_LOGS_LOCATOR_ID;

  constructor(private readonly locators: LocatorClient) {}

  public readonly getLocation = async (params: NodeLogsLocatorParams) => {
    const infraNodeLogsLocator = this.locators.get<InfraNodeLogsLocatorParams>(
      INFRA_NODE_LOGS_LOCATOR_ID
    );
    const { nodeId, nodeType, time } = params;
    if (infraNodeLogsLocator) {
      return infraNodeLogsLocator.getLocation({
        nodeId,
        nodeType,
        time,
      });
    }

    const allDatasetsLocator =
      this.locators.get<AllDatasetsLocatorParams>(ALL_DATASETS_LOCATOR_ID)!;
    return allDatasetsLocator.getLocation({
      query: getNodeQuery(nodeType, nodeId),
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
