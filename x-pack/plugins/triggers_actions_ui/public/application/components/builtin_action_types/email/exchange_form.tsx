/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFieldText,
  EuiFlexItem,
  EuiFlexGroup,
  EuiFormRow,
  EuiFieldPassword,
  EuiLink,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { IErrorObject } from '../../../../types';
import { EmailActionConnector } from '../types';
import { nullableString } from './email_connector';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';
import { useKibana } from '../../../../common/lib/kibana';

interface ExchangeFormFieldsProps {
  action: EmailActionConnector;
  editActionConfig: (property: string, value: unknown) => void;
  editActionSecrets: (property: string, value: unknown) => void;
  errors: IErrorObject;
  readOnly: boolean;
}

const ExchangeFormFields: React.FunctionComponent<ExchangeFormFieldsProps> = ({
  action,
  editActionConfig,
  editActionSecrets,
  errors,
  readOnly,
}) => {
  const { docLinks } = useKibana().services;
  const { tenantId, clientId } = action.config;
  const { clientSecret } = action.secrets;

  const isClientIdInvalid: boolean =
    clientId !== undefined && errors.clientId !== undefined && errors.clientId.length > 0;
  const isTenantIdInvalid: boolean =
    tenantId !== undefined && errors.tenantId !== undefined && errors.tenantId.length > 0;
  const isClientSecretInvalid: boolean =
    clientSecret !== undefined &&
    errors.clientSecret !== undefined &&
    errors.clientSecret.length > 0;

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="tenantId"
            error={errors.tenantId}
            isInvalid={isTenantIdInvalid}
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.tenantIdFieldLabel',
              {
                defaultMessage: 'Tenant ID',
              }
            )}
            helpText={
              <EuiLink href={docLinks.links.alerting.emailExchangeClientIdConfig} target="_blank">
                <FormattedMessage
                  id="xpack.triggersActionsUI.components.builtinActionTypes.email.exchangeForm.tenantIdHelpLabel"
                  defaultMessage="Configure Tenant ID"
                />
              </EuiLink>
            }
          >
            <EuiFieldText
              fullWidth
              isInvalid={isTenantIdInvalid}
              name="tenantId"
              data-test-subj="emailTenantId"
              readOnly={readOnly}
              value={tenantId || ''}
              placeholder={'00000000-0000-0000-0000-000000000000'}
              onChange={(e) => {
                editActionConfig('tenantId', nullableString(e.target.value));
              }}
              onBlur={() => {
                if (!tenantId) {
                  editActionConfig('tenantId', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow
            id="clientId"
            error={errors.clientId}
            isInvalid={isClientIdInvalid}
            fullWidth
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.clientIdFieldLabel',
              {
                defaultMessage: 'Client ID',
              }
            )}
            helpText={
              <EuiLink href={docLinks.links.alerting.emailExchangeClientIdConfig} target="_blank">
                <FormattedMessage
                  id="xpack.triggersActionsUI.components.builtinActionTypes.email.exchangeForm.clientIdHelpLabel"
                  defaultMessage="Configure Client ID"
                />
              </EuiLink>
            }
          >
            <EuiFieldText
              fullWidth
              isInvalid={isClientIdInvalid}
              name="clientId"
              data-test-subj="emailClientId"
              readOnly={readOnly}
              placeholder={'00000000-0000-0000-0000-000000000000'}
              value={clientId || ''}
              onChange={(e) => {
                editActionConfig('clientId', nullableString(e.target.value));
              }}
              onBlur={() => {
                if (!clientId) {
                  editActionConfig('clientId', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {getEncryptedFieldNotifyLabel(
        !action.id,
        1,
        action.isMissingSecrets ?? false,
        i18n.translate(
          'xpack.triggersActionsUI.components.builtinActionTypes.emailAction.reenterClientSecretLabel',
          {
            defaultMessage: 'Client Secret is encrypted. Please reenter value for this field.',
          }
        )
      )}
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <EuiFormRow
            id="clientSecret"
            fullWidth
            error={errors.clientSecret}
            isInvalid={isClientSecretInvalid}
            label={i18n.translate(
              'xpack.triggersActionsUI.sections.builtinActionTypes.emailAction.clientSecretTextFieldLabel',
              {
                defaultMessage: 'Client Secret',
              }
            )}
            helpText={
              <EuiLink
                href={docLinks.links.alerting.emailExchangeClientSecretConfig}
                target="_blank"
              >
                <FormattedMessage
                  id="xpack.triggersActionsUI.components.builtinActionTypes.email.exchangeForm.clientSecretHelpLabel"
                  defaultMessage="Configure Client Secret"
                />
              </EuiLink>
            }
          >
            <EuiFieldPassword
              fullWidth
              isInvalid={isClientSecretInvalid}
              name="clientSecret"
              readOnly={readOnly}
              value={clientSecret || ''}
              data-test-subj="emailClientSecret"
              onChange={(e) => {
                editActionSecrets('clientSecret', nullableString(e.target.value));
              }}
              onBlur={() => {
                if (!clientSecret) {
                  editActionSecrets('clientSecret', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ExchangeFormFields as default };
