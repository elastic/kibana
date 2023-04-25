/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { DISCOVER_APP_TARGET } from '../../common/constants';
import { findInventoryFields } from '../../common/inventory_models';
import type { InventoryItemType } from '../../common/inventory_models/types';
import type { LogsLocatorParams } from './logs_locator';

const NODE_LOGS_LOCATOR_ID = 'NODE_LOGS_LOCATOR';

export interface NodeLogsLocatorParams extends LogsLocatorParams {
  nodeId: string;
  nodeType: InventoryItemType;
}

export type NodeLogsLocator = LocatorPublic<NodeLogsLocatorParams>;

export class NodeLogsLocatorDefinition implements LocatorDefinition<NodeLogsLocatorParams> {
  public readonly id = NODE_LOGS_LOCATOR_ID;

  constructor(protected readonly appTarget: string) {}

  public readonly getLocation = async (params: NodeLogsLocatorParams) => {
    const { parseSearchString } = await import('./helpers');
    const { nodeType, nodeId, filter } = params;
    const nodeFilter = `${findInventoryFields(nodeType).id}: ${nodeId}`;
    const query = filter ? `(${nodeFilter}) and (${filter})` : nodeFilter;

    const searchString = parseSearchString({ ...params, filter: query });

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
