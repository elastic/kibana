/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { useGetDashboard } from './use_get_dashboard';
import { useKibana } from '../../../../..';

interface Props {
  connectorId: string;
  connectorName: string;
}

export const DashboardLink: React.FC<Props> = ({ connectorId, connectorName }) => {
  const { dashboardUrl } = useGetDashboard({ connectorId });
  const {
    services: {
      application: { navigateToUrl },
    },
  } = useKibana();
  const onClick = useCallback(
    (e) => {
      e.preventDefault();
      if (dashboardUrl) {
        navigateToUrl(dashboardUrl);
      }
    },
    [dashboardUrl, navigateToUrl]
  );
  return dashboardUrl != null ? (
    <EuiLink data-test-subj="link-gen-ai-token-dashboard" onClick={onClick}>
      <FormattedMessage
        id="xpack.triggersActionsUI.sections.editConnectorForm.genAi.dashboardLink"
        values={{ connectorName }}
        defaultMessage={'View Usage Dashboard for "{ connectorName }" Connector'}
      />
    </EuiLink>
  ) : null;
};
