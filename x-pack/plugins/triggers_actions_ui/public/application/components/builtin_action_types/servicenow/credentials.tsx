/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useState } from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
  EuiSwitch,
  EuiSwitchEvent,
} from '@elastic/eui';
import { ActionConnectorFieldsProps } from '../../../../types';
import * as i18n from './translations';
import { ServiceNowActionConnector } from './types';
import { CredentialsApiUrl } from './credentials_api_url';
import { CredentialsAuth, OAuth } from './auth_types';

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
  const [isOAuth, setIsOAuth] = useState(action.config.isOAuth);

  const switchIsOAuth = (e: EuiSwitchEvent) => {
    setIsOAuth(e.target.checked);
    editActionConfig('isOAuth', e.target.checked);
    if (!e.target.checked) {
      editActionConfig('clientId', null);
      editActionConfig('userIdentifierValue', null);
      editActionConfig('jwtKeyId', null);
      editActionSecrets('clientSecret', null);
      editActionSecrets('privateKey', null);
      editActionSecrets('privateKeyPassword', null);
    } else {
      editActionSecrets('username', null);
      editActionSecrets('password', null);
    }
  };

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
      <EuiSpacer size="s" />
      <EuiSwitch
        label={i18n.IS_OAUTH}
        disabled={readOnly}
        checked={isOAuth || false}
        onChange={switchIsOAuth}
      />
      <EuiSpacer size="l" />
      <EuiFlexItem>
        {isOAuth ? (
          <OAuth
            action={action}
            errors={errors}
            readOnly={readOnly}
            isLoading={isLoading}
            editActionSecrets={editActionSecrets}
            editActionConfig={editActionConfig}
          />
        ) : (
          <CredentialsAuth
            action={action}
            errors={errors}
            readOnly={readOnly}
            isLoading={isLoading}
            editActionSecrets={editActionSecrets}
          />
        )}
      </EuiFlexItem>
    </>
  );
};

export const Credentials = memo(CredentialsComponent);
