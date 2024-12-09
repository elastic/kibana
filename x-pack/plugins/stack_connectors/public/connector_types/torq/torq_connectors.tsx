/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import { Field, PasswordField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { UseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import React from 'react';
import TorqWebhookEndpoint from '@kbn/stack-connectors-plugin/public/connector_types/torq/torq_utils';
import * as i18n from './translations';

const { urlField, emptyField } = fieldValidators;

const Callout: React.FC<{ title: string; dataTestSubj: string }> = ({ title, dataTestSubj }) => {
  return (
    <>
      <EuiSpacer size="s" />
      <EuiCallOut size="s" iconType="iInCircle" data-test-subj={dataTestSubj} title={title} />
      <EuiSpacer size="m" />
    </>
  );
};

const TorqActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <Callout title={i18n.HOW_TO_TEXT} dataTestSubj="torq-how-to" />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem>
          <UseField
            path="config.webhookIntegrationUrl"
            config={{
              label: i18n.URL_LABEL,
              validations: [
                {
                  validator: urlField(i18n.URL_INVALID),
                },
                {
                  validator: TorqWebhookEndpoint(i18n.URL_NOT_TORQ_WEBHOOK),
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
          <UseField
            path="secrets.token"
            config={{
              label: i18n.TORQ_TOKEN_LABEL,
              validations: [
                {
                  validator: emptyField(i18n.TORQ_TOKEN_REQUIRED),
                },
              ],
              helpText: i18n.TORQ_TOKEN_HELP_TEXT,
            }}
            component={PasswordField}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'torqTokenInput',
                readOnly,
              },
            }}
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
