/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { NodeLogsLocatorDependencies, NodeLogsLocatorParams } from './node_logs_locator';

const DISCOVER_NODE_LOGS_LOCATOR_ID = 'DISCOVER_NODE_LOGS_LOCATOR';

export type DiscoverNodeLogsLocator = LocatorPublic<NodeLogsLocatorParams>;

export class DiscoverNodeLogsLocatorDefinition implements LocatorDefinition<NodeLogsLocatorParams> {
  public readonly id = DISCOVER_NODE_LOGS_LOCATOR_ID;

  constructor(protected readonly deps: NodeLogsLocatorDependencies) {}

  public readonly getLocation = async (params: NodeLogsLocatorParams) => {
    const { createNodeLogsQuery, getLocationToDiscover } = await import('./helpers');

    const { timeRange, logView } = params;
    const query = createNodeLogsQuery(params);

    return getLocationToDiscover({
      core: this.deps.core,
      timeRange,
      filter: query,
      logView,
    });
  };
}
