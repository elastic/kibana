/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React from 'react';
import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldPassword,
  EuiSpacer,
} from '@elastic/eui';

import * as i18n from './translations';
import { ConnectorFlyoutFormProps } from '../types';
import { ServiceNowActionConnector } from './types';
import { withConnectorFlyout } from '../components/connector_flyout';

const ServiceNowConnectorForm: React.FC<ConnectorFlyoutFormProps<ServiceNowActionConnector>> = ({
  errors,
  action,
  onChangeSecret,
  onBlurSecret,
}) => {
  const { username, password } = action.secrets;
  const isUsernameInvalid: boolean = errors.username.length > 0 && username != null;
  const isPasswordInvalid: boolean = errors.password.length > 0 && password != null;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-servicenow-username"
            fullWidth
            error={errors.username}
            isInvalid={isUsernameInvalid}
            label={i18n.USERNAME_LABEL}
          >
            <EuiFieldText
              fullWidth
              isInvalid={isUsernameInvalid}
              name="connector-servicenow-username"
              value={username || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-servicenow-username-form-input"
              onChange={evt => onChangeSecret('username', evt.target.value)}
              onBlur={() => onBlurSecret('username')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-servicenow-password"
            fullWidth
            error={errors.password}
            isInvalid={isPasswordInvalid}
            label={i18n.PASSWORD_LABEL}
          >
            <EuiFieldPassword
              fullWidth
              isInvalid={isPasswordInvalid}
              name="connector-servicenow-password"
              value={password || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-servicenow-password-form-input"
              onChange={evt => onChangeSecret('password', evt.target.value)}
              onBlur={() => onBlurSecret('password')}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

export const ServiceNowConnectorFlyout = withConnectorFlyout<ServiceNowActionConnector>({
  ConnectorFormComponent: ServiceNowConnectorForm,
  secretKeys: ['username', 'password'],
});
