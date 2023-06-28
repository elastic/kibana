/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { uptimeOverviewLocatorID } from '@kbn/observability-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';
import type { InventoryItemType } from '../../../../common/inventory_models/types';

export interface LinkToUptimeProps {
  nodeType: InventoryItemType;
  nodeName: string;
  nodeIp?: string | null;
}

export const LinkToUptime = ({ nodeType, nodeName, nodeIp }: LinkToUptimeProps) => {
  const { share } = useKibanaContextForPlugin().services;

  return (
    <EuiButtonEmpty
      data-test-subj="hostsView-flyout-uptime-link"
      size="xs"
      iconSide="left"
      iconType="popout"
      flush="both"
      onClick={() =>
        share.url.locators
          .get(uptimeOverviewLocatorID)!
          .navigate({ [nodeType]: nodeName, ip: nodeIp })
      }
    >
      <FormattedMessage
        id="xpack.infra.hostsViewPage.flyout.uptimeLinkLabel"
        defaultMessage="Uptime"
      />
    </EuiButtonEmpty>
  );
};
