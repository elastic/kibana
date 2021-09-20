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
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { IErrorObject } from '../../../../types';
import { EmailActionConnector } from '../types';
import { nullableString } from './email_connector';

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
          >
            <EuiFieldText
              fullWidth
              isInvalid={isTenantIdInvalid}
              name="tenantId"
              data-test-subj="emailTenantId"
              readOnly={readOnly}
              value={tenantId || ''}
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
          >
            <EuiFieldText
              fullWidth
              isInvalid={isClientIdInvalid}
              name="clientId"
              data-test-subj="emailClientId"
              readOnly={readOnly}
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
