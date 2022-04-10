/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
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

import { ActionConnectorFieldsProps } from '../../../../types';
import { getEncryptedFieldNotifyLabel } from '../../get_encrypted_field_notify_label';
import { TinesActionConnector } from './types';

const TinesConnectorFields: React.FC<ActionConnectorFieldsProps<TinesActionConnector>> = ({
  action,
  editActionSecrets,
  editActionConfig,
  errors,
  readOnly,
}) => {
  const { url } = action.config;
  const { email, apiToken } = action.secrets;
  const isUrlInvalid: boolean =
    url !== undefined && errors.url !== undefined && errors.url.length > 0;

  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow id="url" fullWidth error={errors.url} isInvalid={isUrlInvalid} label={'URL'}>
            <EuiFieldText
              fullWidth
              isInvalid={isUrlInvalid}
              name="url"
              readOnly={readOnly}
              value={url || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="urlFromInput"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                editActionConfig('url', e.target.value);
              }}
              onBlur={() => {
                if (!url) {
                  editActionConfig('url', '');
                }
              }}
            />
          </EuiFormRow>
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
              'Authentication credentials are encrypted. Please reenter values for these fields'
            )}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-tines-email"
            fullWidth
            error={errors.email}
            isInvalid={false}
            label={'Email'}
          >
            <EuiFieldText
              fullWidth
              isInvalid={false}
              readOnly={readOnly}
              name="connector-tines-email"
              value={email || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-tines-email-form-input"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                editActionSecrets('email', e.target.value);
              }}
              onBlur={() => {
                if (!email) {
                  editActionSecrets('email', '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow
            id="connector-tines-apiToken"
            fullWidth
            error={errors.apiToken}
            isInvalid={false}
            label={'API token'}
          >
            <EuiFieldPassword
              fullWidth
              readOnly={readOnly}
              isInvalid={false}
              name="connector-tines-apiToken"
              value={apiToken || ''} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj="connector-tines-apiToken-form-input"
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                editActionSecrets('apiToken', e.target.value);
              }}
              onBlur={() => {
                if (!apiToken) {
                  editActionSecrets('apiToken', '');
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
export { TinesConnectorFields as default };
