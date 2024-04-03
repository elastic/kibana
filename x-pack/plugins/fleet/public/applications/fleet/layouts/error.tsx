/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiErrorBoundary, EuiPanel, EuiEmptyPrompt, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import styled from 'styled-components';

import { MissingESRequirementsPage } from '../sections/agents/agent_requirements_page';
import { WithHeaderLayout, WithoutHeaderLayout } from '../../../layouts';
import { Error } from '../components';

import { DefaultLayout, DefaultPageTitle } from './default';

const Panel = styled(EuiPanel)`
  max-width: 500px;
  margin-right: auto;
  margin-left: auto;
`;

export const ErrorLayout: React.FunctionComponent<{ isAddIntegrationsPath: boolean }> = ({
  isAddIntegrationsPath,
  children,
}) => (
  <EuiErrorBoundary>
    {isAddIntegrationsPath ? (
      <WithHeaderLayout leftColumn={<DefaultPageTitle />}>{children}</WithHeaderLayout>
    ) : (
      <DefaultLayout>
        <WithoutHeaderLayout>{children}</WithoutHeaderLayout>
      </DefaultLayout>
    )}
  </EuiErrorBoundary>
);

export const PermissionsError: React.FunctionComponent<{
  error: string;
  requiredFleetRole?: string;
}> = React.memo(({ error, requiredFleetRole }) => {
  if (error === 'MISSING_SECURITY') {
    return <MissingESRequirementsPage missingRequirements={['security_required', 'api_keys']} />;
  }

  if (error === 'MISSING_PRIVILEGES') {
    return (
      <Panel data-test-subj="missingPrivilegesPrompt">
        <EuiEmptyPrompt
          iconType="securityApp"
          title={
            <h2 data-test-subj="missingPrivilegesPromptTitle">
              <FormattedMessage
                id="xpack.fleet.permissionDeniedErrorTitle"
                defaultMessage="Permission denied"
              />
            </h2>
          }
          body={
            <p data-test-subj="missingPrivilegesPromptMessage">
              {requiredFleetRole ? (
                <FormattedMessage
                  id="xpack.fleet.pagePermissionDeniedErrorMessage"
                  defaultMessage="You are not authorized to access that page. It requires the {roleName} Kibana privilege for Fleet."
                  values={{
                    roleName: <EuiCode>{requiredFleetRole}</EuiCode>,
                  }}
                />
              ) : (
                <FormattedMessage
                  id="xpack.fleet.permissionDeniedErrorMessage"
                  defaultMessage="You are not authorized to access Fleet. It requires the {roleName1} Kibana privilege for Fleet, and the {roleName2} or {roleName1} privilege for Integrations."
                  values={{
                    roleName1: <EuiCode>&quot;All&quot;</EuiCode>,
                    roleName2: <EuiCode>&quot;Read&quot;</EuiCode>,
                  }}
                />
              )}
            </p>
          }
        />
      </Panel>
    );
  }

  return (
    <Error
      title={
        <FormattedMessage
          id="xpack.fleet.permissionsRequestErrorMessageTitle"
          defaultMessage="Unable to check permissions"
        />
      }
      error={i18n.translate('xpack.fleet.permissionsRequestErrorMessageDescription', {
        defaultMessage: 'There was a problem checking Fleet permissions',
      })}
    />
  );
});
