/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { get } from 'lodash';
import type { InventoryItemType } from '../../../../../common/inventory_models/types';
import type { LinkDescriptor } from '../../../../hooks/use_link_props';
import type { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../../lib/lib';

export const createUptimeLink = (
  options: InfraWaffleMapOptions,
  nodeType: InventoryItemType,
  node: InfraWaffleMapNode
): LinkDescriptor => {
  if (nodeType === 'host' && node.ip) {
    return {
      app: 'uptime',
      hash: '/',
      search: {
        search: `host.ip:"${node.ip}"`,
      },
    };
  }
  const field = get(options, ['fields', nodeType], '');
  return {
    app: 'uptime',
    hash: '/',
    search: {
      search: `${field ? field + ':' : ''}"${node.id}"`,
    },
  };
};
