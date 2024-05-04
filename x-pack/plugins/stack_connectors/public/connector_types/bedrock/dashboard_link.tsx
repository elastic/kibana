/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { useKibana } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';
import { useGetDashboard } from '../lib/gen_ai/use_get_dashboard';

interface Props {
  connectorId: string;
  connectorName: string;
  selectedProvider?: string;
}
// tested from ./connector.test.tsx
export const DashboardLink: React.FC<Props> = ({
  connectorId,
  connectorName,
  selectedProvider = 'Bedrock',
}) => {
  const { dashboardUrl } = useGetDashboard({ connectorId, selectedProvider });
  const {
    services: {
      application: { navigateToUrl },
    },
  } = useKibana();
  const onClick = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      if (dashboardUrl) {
        navigateToUrl(dashboardUrl);
      }
    },
    [dashboardUrl, navigateToUrl]
  );
  return dashboardUrl != null ? (
    // href gives us right click -> open in new tab
    // onclick prevents page reload
    // eslint-disable-next-line @elastic/eui/href-or-on-click
    <EuiLink data-test-subj="link-gen-ai-token-dashboard" onClick={onClick} href={dashboardUrl}>
      {i18n.USAGE_DASHBOARD_LINK(selectedProvider, connectorName)}
    </EuiLink>
  ) : null;
};

// eslint-disable-next-line import/no-default-export
export { DashboardLink as default };
