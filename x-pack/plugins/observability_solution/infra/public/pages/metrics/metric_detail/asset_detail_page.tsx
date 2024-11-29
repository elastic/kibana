/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useRouteMatch } from 'react-router-dom';
import type { InventoryItemType } from '@kbn/metrics-data-access-plugin/common';
import { AssetDetails } from '../../../components/asset_details';
import { getAssetDetailsTabs } from '../../../common/asset_details_config/asset_details_tabs';

export const AssetDetailPage = () => {
  const {
    params: { type: nodeType, node: nodeId },
  } = useRouteMatch<{ type: InventoryItemType; node: string }>();

  return (
    <AssetDetails
      assetId={nodeId}
      assetType={nodeType}
      tabs={getAssetDetailsTabs(nodeType)}
      renderMode={{
        mode: 'page',
      }}
    />
  );
};
