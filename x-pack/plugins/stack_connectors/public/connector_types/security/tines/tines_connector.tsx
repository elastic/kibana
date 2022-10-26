/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ActionConnectorFieldsProps, PasswordField } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';

const { emptyField, urlField } = fieldValidators;

const TinesActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => (
  <EuiFlexGroup direction="column" justifyContent="spaceBetween">
    <EuiFlexItem>
      <EuiSpacer size="m" />
      <UseField
        path="config.url"
        config={{
          label: i18n.URL_LABEL,
          validations: [{ validator: urlField(i18n.URL_INVALID) }],
        }}
        component={Field}
        componentProps={{
          euiFieldProps: { readOnly, 'data-test-subj': 'tinesUrlInput', fullWidth: true },
        }}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <EuiSpacer size="s" />
      <EuiTitle size="xxs">
        <h4>{i18n.AUTHENTICATION_TITLE}</h4>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem>
      <UseField
        path="secrets.email"
        config={{
          label: i18n.EMAIL_LABEL,
          validations: [{ validator: emptyField(i18n.EMAIL_REQUIRED) }],
        }}
        component={Field}
        componentProps={{
          euiFieldProps: { readOnly, 'data-test-subj': 'tinesEmailInput' },
        }}
      />
    </EuiFlexItem>
    <EuiFlexItem>
      <PasswordField
        path="secrets.token"
        label={i18n.TOKEN_LABEL}
        config={{
          validations: [{ validator: emptyField(i18n.TOKEN_REQUIRED) }],
        }}
        readOnly={readOnly}
        data-test-subj="tinesTokenInput"
      />
    </EuiFlexItem>
  </EuiFlexGroup>
);

// eslint-disable-next-line import/no-default-export
export { TinesActionConnectorFields as default };
