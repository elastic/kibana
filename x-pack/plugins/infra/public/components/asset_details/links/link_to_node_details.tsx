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

export interface LinkToAlertsRule {
  currentTime: number;
  nodeId: string;
  nodeType: InventoryItemType;
}

export const LinkToNodeDetails = ({ nodeId, nodeType, currentTime }: LinkToAlertsRule) => {
  const inventoryModel = findInventoryModel(nodeType);
  const nodeDetailFrom = currentTime - inventoryModel.metrics.defaultTimeRangeInSeconds * 1000;

  const nodeDetailMenuItemLinkProps = useLinkProps({
    ...getNodeDetailUrl({
      nodeType,
      nodeId,
      from: nodeDetailFrom,
      to: currentTime,
    }),
  });

  return (
    <EuiButtonEmpty
      data-test-subj="infraNodeContextPopoverOpenAsPageButton"
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
