/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiCode, EuiEmptyPrompt, EuiPanel } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';

import styled from 'styled-components';

const Panel = styled(EuiPanel)`
  max-width: 500px;
  margin-right: auto;
  margin-left: auto;
`;

export const FleetServerMissingKbnPrivileges = () => {
  return (
    <Panel data-test-subj="fleetServerMissingPrivilegesPrompt">
      <EuiEmptyPrompt
        iconType="securityApp"
        title={
          <h2 data-test-subj="fleetServerMissingPrivilegesTitle">
            <FormattedMessage
              id="xpack.fleet.fleetServerSetupPermissionDeniedErrorTitle"
              defaultMessage="Permission denied"
            />
          </h2>
        }
        body={
          <p data-test-subj="fleetServerMissingPrivilegesMessage">
            <FormattedMessage
              id="xpack.fleet.fleetServerSetupKbnPermissionDeniedErrorMessage"
              defaultMessage="Fleet Server needs to be set up. This requires the Kibana Fleet {agentPrivilegeName} and {settingsPrivilegeName} privileges. Contact your administrator."
              values={{
                agentPrivilegeName: <EuiCode>&quot;agents: all&quot;</EuiCode>,
                settingsPrivilegeName: <EuiCode>&quot;settings: all&quot;</EuiCode>,
              }}
            />
          </p>
        }
      />
    </Panel>
  );
};
