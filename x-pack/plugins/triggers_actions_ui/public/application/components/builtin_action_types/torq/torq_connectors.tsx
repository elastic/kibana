/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiButtonIcon,
  EuiTitle,
  EuiButtonEmpty,
  EuiCallOut,
} from '@elastic/eui';
import {
  UseArray,
  UseField,
  useFormContext,
  useFormData,
  ValidationError,
  ValidationFunc,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  Field,
  SelectField,
  TextField,
  ToggleField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { ActionConnectorFieldsProps } from '../../../../types';
import * as i18n from './translations';
import { PasswordField } from '../../password_field';
import { isUrl } from '@kbn/es-ui-shared-plugin/static/validators/string';
import { ERROR_CODE } from '@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types';

const { emptyField, urlField } = fieldValidators;

const Callout: React.FC<{ title: string; dataTestSubj: string }> = ({ title, dataTestSubj }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut size="s" iconType="iInCircle" data-test-subj={dataTestSubj} title={title} />
      <EuiSpacer size="m" />
    </>
  );
};

const torqWebhookEndpoint = (message: string) => (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
  const [{ value }] = args;
  const error: ValidationError<ERROR_CODE> = {
    code: 'ERR_FIELD_FORMAT',
    formatType: 'URL',
    message,
  };
  if (!isUrl(value)) return error;
  const hostname = new URL(value).hostname;
  return hostname === "hooks.torq.io" ? undefined : error;
};

const TorqActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <Callout
            title={i18n.TORQ_HOW_TO_TEXT}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <UseField
            path="config.webhook_integration_url"
            config={{
              label: i18n.URL_LABEL,
              validations: [
                {
                  validator: urlField(i18n.URL_INVALID),
                },
                {
                  validator: torqWebhookEndpoint(i18n.URL_NOT_TORQ_WEBHOOK),
                },
              ],
            }}
            helpText={i18n.URL_HELP_TEXT}
            component={Field}
            componentProps={{
              euiFieldProps: { readOnly, 'data-test-subj': 'torqUrlText', fullWidth: true },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
            <PasswordField
              path="secrets.token"
              label={i18n.TORQ_TOKEN_LABEL}
              readOnly={readOnly}
              helpText={i18n.TORQ_TOKEN_HELP_TEXT}
              data-test-subj="torqTokenInput"
            />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      <EuiSpacer size="m" />
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { TorqActionConnectorFields as default };
