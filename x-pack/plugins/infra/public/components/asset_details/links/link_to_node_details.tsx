/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiButtonEmpty } from '@elastic/eui';
import { useLinkProps } from '@kbn/observability-shared-plugin/public';
import { getNodeDetailUrl } from '../../../pages/link_to';
import { findInventoryModel } from '../../../../common/inventory_models';
import type { InventoryItemType } from '../../../../common/inventory_models/types';
import type { Asset } from '../types';

export interface LinkToNodeDetailsProps {
  currentTimestamp: number;
  asset: Asset;
  assetType: InventoryItemType;
}

export const LinkToNodeDetails = ({
  asset,
  assetType,
  currentTimestamp,
}: LinkToNodeDetailsProps) => {
  const inventoryModel = findInventoryModel(assetType);
  const nodeDetailFrom = currentTimestamp - inventoryModel.metrics.defaultTimeRangeInSeconds * 1000;

  const nodeDetailMenuItemLinkProps = useLinkProps({
    ...getNodeDetailUrl({
      nodeType: assetType,
      nodeId: asset.id,
      from: nodeDetailFrom,
      to: currentTimestamp,
      assetName: asset.name,
    }),
  });

  return (
    <EuiButtonEmpty
      data-test-subj="infraAssetDetailsOpenAsPageButton"
      size="xs"
      flush="both"
      {...nodeDetailMenuItemLinkProps}
    >
      <FormattedMessage
        id="xpack.infra.infra.nodeDetails.openAsPage"
        defaultMessage="Open as page"
      />
    </EuiButtonEmpty>
  );
};
