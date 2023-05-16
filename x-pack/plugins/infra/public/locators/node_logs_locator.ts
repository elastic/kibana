/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { InventoryItemType } from '../../common/inventory_models/types';
import type { LogsLocatorDependencies, LogsLocatorParams } from './logs_locator';

const NODE_LOGS_LOCATOR_ID = 'NODE_LOGS_LOCATOR';

export interface NodeLogsLocatorParams extends LogsLocatorParams {
  nodeId: string;
  nodeType: InventoryItemType;
}

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
