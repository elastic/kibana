/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InfraWaffleMapNode } from '../../../../lib/lib';
import { InventoryItemType } from '../../../../../common/inventory_models/types';
import { uptimeOverviewLocatorID } from '../../../../../../observability/public';
import { LocatorClient } from '../../../../../../../../src/plugins/share/common/url_service/locators';

export const navigateToUptime = (
  locators: LocatorClient,
  nodeType: InventoryItemType,
  node: InfraWaffleMapNode
) => {
  return locators.get(uptimeOverviewLocatorID)!.navigate({ [nodeType]: node.id, ip: node.ip });
};
