/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

const panelCss = {
  maxWidth: '500px',
  marginRight: 'auto',
  marginLeft: 'auto',
};

const MissingPrivilegesComponent = () => (
  <div>
    <EuiSpacer />
    <EuiPanel css={panelCss}>
      <EuiEmptyPrompt
        iconType="securityApp"
        title={
          <h2>
            <FormattedMessage
              id="xpack.osquery.permissionDeniedErrorTitle"
              defaultMessage="Permission denied"
            />
          </h2>
        }
        body={
          <p>
            <FormattedMessage
              id="xpack.osquery.permissionDeniedErrorMessage"
              defaultMessage="You are not authorized to access this page."
            />
          </p>
        }
      />
    </EuiPanel>
    <EuiSpacer />
  </div>
);

export const MissingPrivileges = React.memo(MissingPrivilegesComponent);
