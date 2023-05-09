/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import type { InventoryItemType } from '../../common/inventory_models/types';
import type { InfraClientCoreSetup } from '../types';
import type { LogsLocatorParams } from './logs_locator';
import { DISCOVER_APP_TARGET } from '../../common/constants';

const NODE_LOGS_LOCATOR_ID = 'NODE_LOGS_LOCATOR';

export interface NodeLogsLocatorParams extends LogsLocatorParams {
  nodeId: string;
  nodeType: InventoryItemType;
}

export type NodeLogsLocator = LocatorPublic<NodeLogsLocatorParams>;

export interface NodeLogsLocatorDependencies {
  core: InfraClientCoreSetup;
  appTarget: string;
}

export class NodeLogsLocatorDefinition implements LocatorDefinition<NodeLogsLocatorParams> {
  public readonly id = NODE_LOGS_LOCATOR_ID;

  constructor(protected readonly deps: NodeLogsLocatorDependencies) {}

  public readonly getLocation = async (params: NodeLogsLocatorParams) => {
    const { parseSearchString, getLocationToDiscover } = await import('./helpers');
    const { findInventoryFields } = await import('../../common/inventory_models');

    const { nodeType, nodeId, filter, timeRange, logView } = params;
    const nodeFilter = `${findInventoryFields(nodeType).id}: ${nodeId}`;
    const query = filter ? `(${nodeFilter}) and (${filter})` : nodeFilter;

    if (this.deps.appTarget === DISCOVER_APP_TARGET) {
      return await getLocationToDiscover({ core: this.deps.core, timeRange, filter, logView });
    }

    const searchString = parseSearchString({ ...params, filter: query });

    return {
      app: 'logs',
      path: `/stream?${searchString}`,
      state: {},
    };
  };
}
