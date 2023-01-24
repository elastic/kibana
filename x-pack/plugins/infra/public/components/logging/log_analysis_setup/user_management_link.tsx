/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiButtonProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { useLinkProps } from '@kbn/observability-plugin/public';
import { useKibanaContextForPlugin } from '../../../hooks/use_kibana';

export const UserManagementLink: React.FunctionComponent<EuiButtonProps> = (props) => {
  const {
    services: {
      application: { capabilities },
    },
  } = useKibanaContextForPlugin();
  const canAccessUserManagement = capabilities?.management?.security?.users ?? false;

  const linkProps = useLinkProps({
    app: 'management',
    pathname: '/security/users',
  });

  if (!canAccessUserManagement) return null;

  return (
    <EuiButton color="primary" fill {...linkProps} {...props}>
      <FormattedMessage
        id="xpack.infra.logs.analysis.userManagementButtonLabel"
        defaultMessage="Manage users"
      />
    </EuiButton>
  );
};
