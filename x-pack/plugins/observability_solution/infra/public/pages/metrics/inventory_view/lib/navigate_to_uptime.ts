/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { uptimeOverviewLocatorID } from '@kbn/observability-plugin/public';
import { LocatorClient } from '@kbn/share-plugin/common/url_service/locators';
import { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { InfraWaffleMapNode } from '../../../../lib/lib';

export const navigateToUptime = (
  locators: LocatorClient,
  nodeType: InventoryItemType,
  node: InfraWaffleMapNode
) => {
  return locators.get(uptimeOverviewLocatorID)!.navigate({ [nodeType]: node.id, ip: node.ip });
};
