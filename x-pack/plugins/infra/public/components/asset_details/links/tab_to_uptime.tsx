/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiTab, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { uptimeOverviewLocatorID } from '@kbn/observability-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import type { InventoryItemType } from '../../../../common/inventory_models/types';
import type { Tab } from '../types';

export interface LinkToUptimeProps extends Tab {
  assetType: InventoryItemType;
  assetName: string;
  nodeIp?: string | null;
}

export const TabToUptime = ({
  assetType,
  assetName,
  nodeIp,
  name,
  ...props
}: LinkToUptimeProps) => {
  const { share } = useKibanaContextForPlugin().services;
  const { euiTheme } = useEuiTheme();

  return (
    <EuiTab
      {...props}
      data-test-subj="infraAssetDetailsUptimeLinkTab"
      onClick={() =>
        share.url.locators
          .get(uptimeOverviewLocatorID)!
          .navigate({ [assetType]: assetName, ip: nodeIp })
      }
    >
      <EuiIcon
        type="popout"
        css={css`
          margin-right: ${euiTheme.size.xs};
        `}
      />
      {name}
    </EuiTab>
  );
};
