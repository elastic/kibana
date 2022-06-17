/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexItem, EuiFlexGroup, EuiLink } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { useKibana } from '../../../../common/lib/kibana';
import * as i18n from './translations';
import { PasswordField } from '../../password_field';

const { emptyField } = fieldValidators;

interface ExchangeFormFieldsProps {
  readOnly: boolean;
}

const ExchangeFormFields: React.FC<ExchangeFormFieldsProps> = ({ readOnly }) => {
  const { docLinks } = useKibana().services;

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <UseField
            path="config.tenantId"
            component={TextField}
            config={{
              label: i18n.TENANT_ID_LABEL,
              helpText: (
                <EuiLink href={docLinks.links.alerting.emailExchangeClientIdConfig} target="_blank">
                  <FormattedMessage
                    id="xpack.triggersActionsUI.components.builtinActionTypes.email.exchangeForm.tenantIdHelpLabel"
                    defaultMessage="Configure Tenant ID"
                  />
                </EuiLink>
              ),
              validations: [
                {
                  validator: emptyField(i18n.TENANT_ID_REQUIRED),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: { 'data-test-subj': 'emailTenantId' },
              readOnly,
              placeholder: '00000000-0000-0000-0000-000000000000',
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="config.clientId"
            component={TextField}
            config={{
              label: i18n.CLIENT_ID_LABEL,
              helpText: (
                <EuiLink href={docLinks.links.alerting.emailExchangeClientIdConfig} target="_blank">
                  <FormattedMessage
                    id="xpack.triggersActionsUI.components.builtinActionTypes.email.exchangeForm.clientIdHelpLabel"
                    defaultMessage="Configure Client ID"
                  />
                </EuiLink>
              ),
              validations: [
                {
                  validator: emptyField(i18n.CLIENT_ID_REQUIRED),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: { 'data-test-subj': 'emailClientId' },
              readOnly,
              placeholder: '00000000-0000-0000-0000-000000000000',
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <PasswordField
            path="secrets.clientSecret"
            label={i18n.CLIENT_SECRET_LABEL}
            readOnly={readOnly}
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
            data-test-subj="emailClientSecret"
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { ExchangeFormFields as default };
