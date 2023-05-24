/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiLink, EuiIcon, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { uptimeOverviewLocatorID } from '@kbn/observability-plugin/public';
import { useKibanaContextForPlugin } from '../../../../../../hooks/use_kibana';
import type { InventoryItemType } from '../../../../../../../common/inventory_models/types';
import type { HostNodeRow } from '../../../hooks/use_hosts_table';

export interface LinkToUptimeProps {
  nodeType: InventoryItemType;
  node: HostNodeRow;
}

export const LinkToUptime = ({ nodeType, node }: LinkToUptimeProps) => {
  const { share } = useKibanaContextForPlugin().services;
  const { euiTheme } = useEuiTheme();

  return (
    <EuiLink
      data-test-subj="hostsView-flyout-uptime-link"
      onClick={() =>
        share.url.locators
          .get(uptimeOverviewLocatorID)!
          .navigate({ [nodeType]: node.name, ip: node.ip })
      }
    >
      <EuiIcon
        type="popout"
        css={css`
          margin-right: ${euiTheme.size.xs};
        `}
      />
      <FormattedMessage
        id="xpack.infra.hostsViewPage.flyout.uptimeLinkLabel"
        defaultMessage="Uptime"
      />
    </EuiLink>
  );
};
