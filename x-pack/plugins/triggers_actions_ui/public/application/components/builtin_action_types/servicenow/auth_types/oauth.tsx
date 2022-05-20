/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { TextAreaField, TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import * as i18n from '../translations';
import { PasswordField } from '../../../password_field';

interface Props {
  readOnly: boolean;
  isLoading: boolean;
}

const { emptyField } = fieldValidators;

const OAuthComponent: React.FC<Props> = ({ isLoading, readOnly }) => {
  return (
    <>
      <UseField
        path="config.clientId"
        component={TextField}
        config={{
          label: i18n.CLIENTID_LABEL,
          validations: [
            {
              validator: emptyField(i18n.CLIENTID_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'connector-servicenow-client-id-form-input',
            readOnly,
            isLoading,
          },
        }}
      />
      <UseField
        path="config.userIdentifierValue"
        component={TextField}
        config={{
          label: i18n.USER_EMAIL_LABEL,
          validations: [
            {
              validator: emptyField(i18n.USERNAME_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'connector-servicenow-user-identifier-form-input',
            readOnly,
            isLoading,
          },
        }}
      />
      <UseField
        path="config.jwtKeyId"
        component={TextField}
        config={{
          label: i18n.KEY_ID_LABEL,
          validations: [
            {
              validator: emptyField(i18n.KEYID_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'connector-servicenow-jwt-key-id-form-input',
            readOnly,
            isLoading,
          },
        }}
      />
      <PasswordField
        path="secrets.clientSecret"
        label={i18n.CLIENTSECRET_LABEL}
        readOnly={readOnly}
        data-test-subj="connector-servicenow-client-secret-form-input"
        isLoading={isLoading}
      />
      <UseField
        path="secrets.clientSecret"
        component={TextField}
        config={{
          label: i18n.CLIENTSECRET_LABEL,
          validations: [
            {
              validator: emptyField(i18n.CLIENTSECRET_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'connector-servicenow-client-secret-form-input',
            readOnly,
            isLoading,
          },
        }}
      />
      <UseField
        path="secrets.privateKey"
        component={TextAreaField}
        config={{
          label: i18n.PRIVATE_KEY_LABEL,
          validations: [
            {
              validator: emptyField(i18n.PRIVATE_KEY_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'connector-servicenow-private-key-form-input',
            readOnly,
            isLoading,
          },
        }}
      />
      <PasswordField
        path="secrets.privateKeyPassword"
        label={i18n.PRIVATE_KEY_PASSWORD_LABEL}
        helpText={i18n.PRIVATE_KEY_PASSWORD_HELPER_TEXT}
        data-test-subj="connector-servicenow-private-key-password-form-input"
        readOnly={readOnly}
        isLoading={isLoading}
      />
    </>
  );
};

export const OAuth = memo(OAuthComponent);
