/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSteps,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useForm, Form } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { snExternalServiceConfig } from '../../../../common/servicenow_config';
import { CredentialsApiUrl } from './credentials_api_url';
import { CredentialsAuth, OAuth } from './auth_types';
import { SNStoreLink } from './sn_store_button';
import { ApplicationRequiredCallout } from './application_required_callout';
import { ServiceNowConfig, ServiceNowSecrets } from './types';

const title = i18n.translate('xpack.stackConnectors.components.serviceNow.updateFormTitle', {
  defaultMessage: 'Update ServiceNow connector',
});

const step1InstallTitle = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.updateFormInstallTitle',
  {
    defaultMessage: 'Install the Elastic ServiceNow app',
  }
);

const step2InstanceUrlTitle = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.updateFormUrlTitle',
  {
    defaultMessage: 'Enter your ServiceNow instance URL',
  }
);

const step3CredentialsTitle = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.updateFormCredentialsTitle',
  {
    defaultMessage: 'Provide authentication credentials',
  }
);

const cancelButtonText = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.cancelButtonText',
  {
    defaultMessage: 'Cancel',
  }
);

const confirmButtonText = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.confirmButtonText',
  {
    defaultMessage: 'Update',
  }
);

const warningMessage = i18n.translate(
  'xpack.stackConnectors.components.serviceNow.warningMessage',
  {
    defaultMessage: 'This updates all instances of this connector and cannot be reversed.',
  }
);
export interface UpdateConnectorFormSchema {
  updatedConnector: {
    config: ServiceNowConfig;
    secrets: ServiceNowSecrets;
  };
}

export interface Props {
  actionTypeId: string;
  isOAuth: boolean;
  isLoading: boolean;
  readOnly: boolean;
  updateErrorMessage?: string | null;
  onCancel: () => void;
  onConfirm: (connector: UpdateConnectorFormSchema['updatedConnector']) => void;
}

const PATH_PREFIX = 'updatedConnector.';

const UpdateConnectorComponent: React.FC<Props> = ({
  actionTypeId,
  isOAuth,
  isLoading,
  readOnly,
  onCancel,
  onConfirm,
  updateErrorMessage,
}) => {
  const { form } = useForm<UpdateConnectorFormSchema>();
  const { submit, isValid } = form;

  const onSubmit = useCallback(async () => {
    const { data, isValid: isSubmitValid } = await submit();
    if (!isSubmitValid) {
      return;
    }

    const { updatedConnector } = data;
    onConfirm(updatedConnector);
  }, [onConfirm, submit]);

  return (
    <Form form={form}>
      <EuiFlyout ownFocus onClose={onCancel} data-test-subj="updateConnectorForm">
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h1>{title}</h1>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody
          banner={
            <EuiCallOut
              size="m"
              color="danger"
              iconType="alert"
              data-test-subj="snUpdateInstallationCallout"
              title={warningMessage}
            />
          }
        >
          <EuiFlexGroup>
            <EuiSteps
              steps={[
                {
                  title: step1InstallTitle,
                  children: (
                    <FormattedMessage
                      id="xpack.stackConnectors.components.serviceNow.appRunning"
                      defaultMessage="The Elastic App from the ServiceNow app store must be installed prior to running the update. {visitLink} to install the app"
                      values={{
                        visitLink: (
                          <SNStoreLink appId={snExternalServiceConfig[actionTypeId].appId ?? ''} />
                        ),
                      }}
                    />
                  ),
                },
                {
                  title: step2InstanceUrlTitle,
                  children: (
                    <CredentialsApiUrl
                      readOnly={readOnly}
                      isLoading={isLoading}
                      pathPrefix={PATH_PREFIX}
                    />
                  ),
                },
                {
                  title: step3CredentialsTitle,
                  children: isOAuth ? (
                    <OAuth readOnly={readOnly} isLoading={isLoading} pathPrefix={PATH_PREFIX} />
                  ) : (
                    <CredentialsAuth
                      readOnly={readOnly}
                      isLoading={isLoading}
                      pathPrefix={PATH_PREFIX}
                    />
                  ),
                },
              ]}
            />
          </EuiFlexGroup>
          <EuiFlexGroup>
            <EuiFlexItem>
              {updateErrorMessage != null ? (
                <ApplicationRequiredCallout
                  message={updateErrorMessage}
                  appId={snExternalServiceConfig[actionTypeId].appId ?? ''}
                />
              ) : null}
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="flexEnd">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty data-test-subj="snUpdateInstallationCancel" onClick={onCancel}>
                {cancelButtonText}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                data-test-subj="snUpdateInstallationSubmit"
                onClick={onSubmit}
                color="danger"
                fill
                disabled={!isValid}
                isLoading={isLoading}
              >
                {confirmButtonText}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    </Form>
  );
};

export const UpdateConnector = memo(UpdateConnectorComponent);
