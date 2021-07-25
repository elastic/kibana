/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useState } from 'react';

import {
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiFieldPassword,
  EuiSpacer,
  EuiLink,
  EuiTitle,
} from '@elastic/eui';

import { FormattedMessage } from '@kbn/i18n/react';
import { ActionConnectorFieldsProps } from '../../../../types';

import * as i18n from './translations';
import { ServiceNowActionConnector } from './types';
import { useKibana } from '../../../../common/lib/kibana';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';
import { DeprecatedCallout } from './deprecated_callout';
import { useGetAppInfo } from './use_get_app_info';
import { ApplicationRequiredCallout } from './application_required_callout';
import { isRESTApiError } from './helpers';

const ServiceNowConnectorFields: React.FC<
  ActionConnectorFieldsProps<ServiceNowActionConnector>
> = ({
  action,
  editActionSecrets,
  editActionConfig,
  errors,
  consumer,
  readOnly,
  setCallbacks,
  isEdit,
}) => {
  const {
    docLinks,
    notifications: { toasts },
  } = useKibana().services;
  const { apiUrl, isLegacy } = action.config;

  const isApiUrlInvalid: boolean =
    errors.apiUrl !== undefined && errors.apiUrl.length > 0 && apiUrl !== undefined;

  const { username, password } = action.secrets;

  const isUsernameInvalid: boolean =
    errors.username !== undefined && errors.username.length > 0 && username !== undefined;
  const isPasswordInvalid: boolean =
    errors.password !== undefined && errors.password.length > 0 && password !== undefined;

  const handleOnChangeActionConfig = useCallback(
    (key: string, value: string) => editActionConfig(key, value),
    [editActionConfig]
  );

  const handleOnChangeSecretConfig = useCallback(
    (key: string, value: string) => editActionSecrets(key, value),
    [editActionSecrets]
  );

  const { fetchAppInfo, isLoading } = useGetAppInfo({ toastNotifications: toasts });

  const [applicationRequired, setApplicationRequired] = useState<boolean>(false);

  const beforeActionConnectorSave = useCallback(async () => {
    if (!isLegacy) {
      try {
        const res = await fetchAppInfo(action);
        if (isRESTApiError(res)) {
          setApplicationRequired(true);
          return;
        }
      } catch (e) {
        // We need to throw here so the connector will be not be saved.
        throw e;
      }
    }
  }, [action, fetchAppInfo, isLegacy]);

  const afterActionConnectorSave = useCallback(async () => {
    // TODO: Implement
  }, []);

  useEffect(() => setCallbacks({ beforeActionConnectorSave, afterActionConnectorSave }), [
    afterActionConnectorSave,
    beforeActionConnectorSave,
    setCallbacks,
  ]);

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="apiUrl"
            fullWidth
            error={errors.apiUrl}
            isInvalid={isApiUrlInvalid}
            label={i18n.API_URL_LABEL}
            helpText={
              <EuiLink href={docLinks.links.alerting.serviceNowAction} target="_blank">
                <FormattedMessage
                  id="xpack.triggersActionsUI.components.builtinActionTypes.serviceNowAction.apiUrlHelpLabel"
                  defaultMessage="Configure a Personal Developer Instance"
                />
              </EuiLink>
            }
          >
            <EuiFieldText
              fullWidth
              error={errors.apiUrl}
              isInvalid={isApiUrlInvalid}
              name="apiUrl"
              readOnly={readOnly}
              value={apiUrl || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="apiUrlFromInput"
              onChange={(evt) => handleOnChangeActionConfig('apiUrl', evt.target.value)}
              onBlur={() => {
                if (!apiUrl) {
                  editActionConfig('apiUrl', '');
                }
              }}
              disabled={isLoading}
            />
          </EuiFormRow>
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
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth>
            {getEncryptedFieldNotifyLabel(
              !action.id,
              2,
              action.isMissingSecrets ?? false,
              i18n.REENTER_VALUES_LABEL
            )}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
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
              error={errors.username}
              isInvalid={isUsernameInvalid}
              readOnly={readOnly}
              name="connector-servicenow-username"
              value={username || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-servicenow-username-form-input"
              onChange={(evt) => handleOnChangeSecretConfig('username', evt.target.value)}
              onBlur={() => {
                if (!username) {
                  editActionSecrets('username', '');
                }
              }}
              disabled={isLoading}
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
              error={errors.password}
              isInvalid={isPasswordInvalid}
              name="connector-servicenow-password"
              value={password || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-servicenow-password-form-input"
              onChange={(evt) => handleOnChangeSecretConfig('password', evt.target.value)}
              onBlur={() => {
                if (!password) {
                  editActionSecrets('password', '');
                }
              }}
              disabled={isLoading}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <FormattedMessage
        defaultMessage="To use the connector you had to {install} the Elastic App from the ServiceNow Store."
        id="xpack.triggersActionsUI.components.builtinActionTypes.servicenow.appInstallationInfo"
        values={{
          install: (
            <EuiLink href="https://store.servicenow.com/" target="_blank">
              {i18n.INSTALL}
            </EuiLink>
          ),
        }}
      />
      <EuiSpacer size="m" />
      {isLegacy && <DeprecatedCallout />}
      {applicationRequired && <ApplicationRequiredCallout />}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ServiceNowConnectorFields as default };
