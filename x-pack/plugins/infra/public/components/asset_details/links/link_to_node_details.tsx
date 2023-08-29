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
import type { InventoryItemType } from '../../../../common/inventory_models/types';

export interface LinkToNodeDetailsProps {
  dateRangeTimestamp: { from: number; to: number };
  asset: Asset;
  assetType: InventoryItemType;
}

export const LinkToNodeDetails = ({
  asset,
  assetType,
  dateRangeTimestamp,
}: LinkToNodeDetailsProps) => {
  const nodeDetailMenuItemLinkProps = useLinkProps({
    ...getNodeDetailUrl({
      nodeType: assetType,
      nodeId: asset.id,
      from: dateRangeTimestamp.from,
      to: dateRangeTimestamp.to,
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
