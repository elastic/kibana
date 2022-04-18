/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { ActionConnectorFieldsProps } from '../../../../types';
import * as i18n from './translations';
import { ServiceNowActionConnector } from './types';
import { CredentialsApiUrl } from './credentials_api_url';
import { CredentialsAuth } from './credentials_auth';

interface Props {
  action: ActionConnectorFieldsProps<ServiceNowActionConnector>['action'];
  errors: ActionConnectorFieldsProps<ServiceNowActionConnector>['errors'];
  readOnly: boolean;
  isLoading: boolean;
  editActionSecrets: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionSecrets'];
  editActionConfig: ActionConnectorFieldsProps<ServiceNowActionConnector>['editActionConfig'];
}

const CredentialsComponent: React.FC<Props> = ({
  action,
  errors,
  readOnly,
  isLoading,
  editActionSecrets,
  editActionConfig,
}) => {
  return (
    <>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.SN_INSTANCE_LABEL}</h4>
          </EuiTitle>
          <CredentialsApiUrl
            action={action}
            errors={errors}
            readOnly={readOnly}
            isLoading={isLoading}
            editActionConfig={editActionConfig}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.AUTHENTICATION_LABEL}</h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexItem>
        <CredentialsAuth
          action={action}
          errors={errors}
          readOnly={readOnly}
          isLoading={isLoading}
          editActionSecrets={editActionSecrets}
        />
      </EuiFlexItem>
    </>
  );
};

export const Credentials = memo(CredentialsComponent);
