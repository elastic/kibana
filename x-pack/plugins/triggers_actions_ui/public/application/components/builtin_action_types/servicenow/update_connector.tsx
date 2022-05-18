/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
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
import { snExternalServiceConfig } from '@kbn/actions-plugin/common';
import { useForm, useFormData } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { CredentialsApiUrl } from './credentials_api_url';
import { ApplicationRequiredCallout } from './application_required_callout';
import { SNStoreLink } from './sn_store_button';
import { CredentialsAuth, OAuth } from './auth_types';

const title = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.updateFormTitle',
  {
    defaultMessage: 'Update ServiceNow connector',
  }
);

const step1InstallTitle = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.updateFormInstallTitle',
  {
    defaultMessage: 'Install the Elastic ServiceNow app',
  }
);

const step2InstanceUrlTitle = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.updateFormUrlTitle',
  {
    defaultMessage: 'Enter your ServiceNow instance URL',
  }
);

const step3CredentialsTitle = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.updateFormCredentialsTitle',
  {
    defaultMessage: 'Provide authentication credentials',
  }
);

const cancelButtonText = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.cancelButtonText',
  {
    defaultMessage: 'Cancel',
  }
);

const confirmButtonText = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.confirmButtonText',
  {
    defaultMessage: 'Update',
  }
);

const warningMessage = i18n.translate(
  'xpack.triggersActionsUI.components.builtinActionTypes.serviceNow.warningMessage',
  {
    defaultMessage: 'This updates all instances of this connector and cannot be reversed.',
  }
);

export interface Props {
  applicationInfoErrorMsg: string | null;
  isLoading: boolean;
  readOnly: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

const UpdateConnectorComponent: React.FC<Props> = ({
  applicationInfoErrorMsg,
  isLoading,
  readOnly,
  onCancel,
  onConfirm,
}) => {
  const { form } = useForm();
  const [{ actionTypeId }] = useFormData({
    watch: ['actionTypeId'],
  });

  return (
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
                    id="xpack.triggersActionsUI.components.builtinActionTypes.serviceNowAction.serviceNowAppRunning"
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
                children: <CredentialsApiUrl readOnly={readOnly} isLoading={isLoading} />,
              },
              {
                title: step3CredentialsTitle,
                children: <CredentialsAuth readOnly={readOnly} isLoading={isLoading} />,
              },
            ]}
          />
        </EuiFlexGroup>
        <EuiFlexGroup>
          <EuiFlexItem>
            {applicationInfoErrorMsg && (
              <ApplicationRequiredCallout
                message={applicationInfoErrorMsg}
                appId={snExternalServiceConfig[actionTypeId].appId ?? ''}
              />
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};

export const UpdateConnector = memo(UpdateConnectorComponent);
