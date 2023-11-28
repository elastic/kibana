/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { NODE_LOGS_LOCATOR_ID, NodeLogsLocatorParams } from '@kbn/logs-shared-plugin/common';
import type { LogsLocatorDependencies } from './logs_locator';

export type NodeLogsLocator = LocatorPublic<NodeLogsLocatorParams>;

export type NodeLogsLocatorDependencies = LogsLocatorDependencies;

export class NodeLogsLocatorDefinition implements LocatorDefinition<NodeLogsLocatorParams> {
  public readonly id = NODE_LOGS_LOCATOR_ID;

  constructor(protected readonly deps: NodeLogsLocatorDependencies) {}

  public readonly getLocation = async (params: NodeLogsLocatorParams) => {
    const { createNodeLogsQuery, createSearchString } = await import('./helpers');

    const query = createNodeLogsQuery(params);

    const searchString = createSearchString({ ...params, filter: query });

    return {
      app: 'logs',
      path: `/stream?${searchString}`,
      state: {},
    };
  };
}
