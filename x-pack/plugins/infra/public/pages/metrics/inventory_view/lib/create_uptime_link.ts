/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../../lib/lib';
import { InventoryItemType } from '../../../../../common/inventory_models/types';
import { LinkDescriptor } from '../../../../hooks/use_link_props';

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
