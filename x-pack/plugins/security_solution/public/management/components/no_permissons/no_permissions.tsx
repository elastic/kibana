/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiEmptyPrompt, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

export const NoPermissions = memo(() => {
  return (
    <>
      <EuiEmptyPrompt
        iconType="alert"
        iconColor="danger"
        titleSize="l"
        data-test-subj="noIngestPermissions"
        title={
          <FormattedMessage
            id="xpack.securitySolution.endpointManagemnet.noPermissionsText"
            defaultMessage="You do not have the required Kibana permissions to use Elastic Security Administration"
          />
        }
        body={
          <EuiText color="subdued">
            <FormattedMessage
              id="xpack.securitySolution.endpointManagement.noPermissionsSubText"
              defaultMessage="You must have the superuser role to use this feature. If you do not have the superuser role and do not have permissions to edit user roles, contact your Kibana administrator."
            />
          </EuiText>
        }
      />
    </>
  );
});
NoPermissions.displayName = 'NoPermissions';
