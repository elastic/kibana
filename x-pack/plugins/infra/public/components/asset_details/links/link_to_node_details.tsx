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

import { useNodeDetailsRedirect } from '../../../pages/link_to';
import { Asset, AssetDetailsUrlState } from '../types';

export interface LinkToNodeDetailsProps {
  asset: Asset;
  search: AssetDetailsUrlState;
}

export const LinkToNodeDetails = ({ asset, search }: LinkToNodeDetailsProps) => {
  const { getNodeDetailUrl } = useNodeDetailsRedirect();
  const { dateRange, ...assetDetails } = search;

  const nodeDetailMenuItemLinkProps = useLinkProps({
    ...getNodeDetailUrl({
      assetType: 'host',
      assetId: asset.id,
      search: {
        ...assetDetails,
        from: dateRange?.from ? new Date(dateRange?.from).getTime() : undefined,
        to: dateRange?.to ? new Date(dateRange.to).getTime() : undefined,
        name: asset.name,
      },
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
