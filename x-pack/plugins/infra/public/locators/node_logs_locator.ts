/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SerializableRecord } from '@kbn/utility-types';
import { LocatorDefinition, LocatorPublic } from '@kbn/share-plugin/public';
import { flowRight } from 'lodash';
import { findInventoryFields } from '../../common/inventory_models';
import { InventoryItemType } from '../../common/inventory_models/types';
import { replaceLogFilterInQueryString } from '../observability_logs/log_stream_query_state';
import { replaceLogPositionInQueryString } from '../observability_logs/log_stream_position_state/src/url_state_storage_service';
import { replaceLogViewInQueryString } from '../observability_logs/log_view_state';
import { LogsLocatorParams } from './logs_locator';

const NODE_LOGS_LOCATOR_ID = 'NODE_LOGS_LOCATOR';

export interface NodeLogsLocatorParams extends LogsLocatorParams, SerializableRecord {
  nodeId: string;
  nodeType: InventoryItemType;
}

export type NodeLogsLocator = LocatorPublic<NodeLogsLocatorParams>;

export class NodeLogsLocatorDefinition implements LocatorDefinition<NodeLogsLocatorParams> {
  public readonly id = NODE_LOGS_LOCATOR_ID;

  public readonly getLocation = async ({
    nodeId,
    nodeType,
    time = NaN,
    filter = '',
    logViewId = 'default',
  }: NodeLogsLocatorParams) => {
    const nodeFilter = `${findInventoryFields(nodeType).id}: ${nodeId}`;
    const query = filter ? `(${nodeFilter}) and (${filter})` : nodeFilter;

    // TODO: check serverless flag
    // if enabled, use discover locator to return a path to discover
    // if disabled continue with the normal flow

    const searchString = flowRight(
      replaceLogFilterInQueryString({ language: 'kuery', query }, time),
      replaceLogPositionInQueryString(time),
      replaceLogViewInQueryString({ type: 'log-view-reference', logViewId })
    )('');

    const path = `/stream?${searchString}`;

    return {
      app: 'logs',
      path,
      state: {},
    };
  };
}
