/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiSpacer } from '@elastic/eui';
import React from 'react';
import { useConnectors } from '../../../hooks/api/use_connectors';

export const ConnectorPrivilegesCallout: React.FC = () => {
  const { data } = useConnectors();
  if (!data || (data.canManageConnectors && data.canReadConnectors)) {
    return null;
  }
  const calloutTitle = i18n.translate('xpack.serverlessSearch.connectors.noPrivilegesTitle', {
    defaultMessage: 'Insufficient access',
  });
  return (
    <>
      <EuiCallOut title={calloutTitle} color="warning" iconType="iInCircle">
        {data.canReadConnectors
          ? i18n.translate('xpack.serverlessSearch.connectors.noManagePrivileges', {
              defaultMessage:
                'You have read-only access to connectors. Contact your administrator for elevated privileges.',
            })
          : i18n.translate('xpack.serverlessSearch.connectors.noPrivileges', {
              defaultMessage:
                "You don't have access to connectors. Contact your administrator for access.",
            })}
      </EuiCallOut>
      <EuiSpacer />
    </>
  );
};
