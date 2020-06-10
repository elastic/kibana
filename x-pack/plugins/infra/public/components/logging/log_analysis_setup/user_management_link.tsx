/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiButtonProps } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';
import React from 'react';
import { useLinkProps } from '../../../hooks/use_link_props';

export const UserManagementLink: React.FunctionComponent<EuiButtonProps> = (props) => {
  const linkProps = useLinkProps({
    app: 'kibana',
    hash: '/management/security/users',
  });
  return (
    <EuiButton color="primary" fill {...linkProps} {...props}>
      <FormattedMessage
        id="xpack.infra.logs.analysis.userManagementButtonLabel"
        defaultMessage="Manage users"
      />
    </EuiButton>
  );
};
