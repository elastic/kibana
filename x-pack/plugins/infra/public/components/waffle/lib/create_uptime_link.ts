/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { get } from 'lodash';
import { InfraWaffleMapNode, InfraWaffleMapOptions } from '../../../lib/lib';
import { InventoryItemType } from '../../../../common/inventory_models/types';

export const createUptimeLink = (
  options: InfraWaffleMapOptions,
  nodeType: InventoryItemType,
  node: InfraWaffleMapNode,
  prefixPathWithBasePath: (path?: string, app?: string) => string | undefined
) => {
  if (nodeType === 'host' && node.ip) {
    const path = `#/?search=host.ip:"${node.ip}"`;
    return prefixPathWithBasePath(path, 'uptime');
  }
  const field = get(options, ['fields', nodeType], '');
  const path = `#/?search=${field ? field + ':' : ''}"${node.id}"`;
  return prefixPathWithBasePath(path, 'uptime');
};
