/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { PasswordField } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from '../translations';

interface Props {
  readOnly: boolean;
  isLoading: boolean;
  pathPrefix?: string;
}

const { emptyField } = fieldValidators;

const CredentialsAuthComponent: React.FC<Props> = ({ isLoading, readOnly, pathPrefix = '' }) => {
  return (
    <>
      <UseField
        path={`${pathPrefix}secrets.username`}
        component={TextField}
        config={{
          label: i18n.USERNAME_LABEL,
          validations: [
            {
              validator: emptyField(i18n.USERNAME_REQUIRED),
            },
          ],
        }}
        componentProps={{
          euiFieldProps: {
            'data-test-subj': 'connector-servicenow-username-form-input',
            isLoading,
            readOnly,
            disabled: readOnly || isLoading,
          },
        }}
      />
      <PasswordField
        path={`${pathPrefix}secrets.password`}
        label={i18n.PASSWORD_LABEL}
        readOnly={readOnly}
        data-test-subj="connector-servicenow-password-form-input"
        isLoading={isLoading}
        disabled={readOnly || isLoading}
      />
    </>
  );
};

export const CredentialsAuth = memo(CredentialsAuthComponent);
