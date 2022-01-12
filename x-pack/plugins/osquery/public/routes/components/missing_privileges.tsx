/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiEmptyPrompt, EuiPanel, EuiSpacer } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import styled from 'styled-components';

const Panel = styled(EuiPanel)`
  max-width: 500px;
  margin-right: auto;
  margin-left: auto;
`;

const MissingPrivilegesComponent = () => (
  <div>
    <EuiSpacer />
    <Panel>
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
    </Panel>
    <EuiSpacer />
  </div>
);

export const MissingPrivileges = React.memo(MissingPrivilegesComponent);
