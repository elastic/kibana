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
} from '@elastic/eui';
import {
  UseArray,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import {
  Field,
  SelectField,
  TextField,
  ToggleField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import type { ActionConnectorFieldsProps } from '@kbn/triggers-actions-ui-plugin/public';
import { PasswordField } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from './translations';

const HTTP_VERBS = ['post', 'put'];
const { emptyField, urlField } = fieldValidators;

const WebhookActionConnectorFields: React.FunctionComponent<ActionConnectorFieldsProps> = ({
  readOnly,
}) => {
  const { getFieldDefaultValue } = useFormContext();
  const [{ config, __internal__ }] = useFormData({
    watch: ['config.hasAuth', '__internal__.hasHeaders'],
  });

  const hasHeadersDefaultValue = !!getFieldDefaultValue<boolean | undefined>('config.headers');

  const hasAuth = config == null ? true : config.hasAuth;
  const hasHeaders = __internal__ != null ? __internal__.hasHeaders : false;

  return (
    <>
      <EuiFlexGroup justifyContent="spaceBetween">
        <EuiFlexItem grow={false}>
          <UseField
            path="config.method"
            component={SelectField}
            config={{
              label: i18n.METHOD_LABEL,
              defaultValue: 'post',
              validations: [
                {
                  validator: emptyField(i18n.METHOD_REQUIRED),
                },
              ],
            }}
            componentProps={{
              euiFieldProps: {
                'data-test-subj': 'webhookMethodSelect',
                options: HTTP_VERBS.map((verb) => ({ text: verb.toUpperCase(), value: verb })),
                fullWidth: true,
                readOnly,
              },
            }}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <UseField
            path="config.url"
            config={{
              label: i18n.URL_LABEL,
              validations: [
                {
                  validator: urlField(i18n.URL_INVALID),
                },
              ],
            }}
            component={Field}
            componentProps={{
              euiFieldProps: { readOnly, 'data-test-subj': 'webhookUrlText', fullWidth: true },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiSpacer size="m" />
          <EuiTitle size="xxs">
            <h4>
              <FormattedMessage
                id="xpack.stackConnectors.components.webhook.authenticationLabel"
                defaultMessage="Authentication"
              />
            </h4>
          </EuiTitle>
          <EuiSpacer size="s" />
          <UseField
            path="config.hasAuth"
            component={ToggleField}
            config={{ defaultValue: true }}
            componentProps={{
              euiFieldProps: {
                label: i18n.HAS_AUTH_LABEL,
                disabled: readOnly,
              },
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
      {hasAuth ? (
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem>
            <UseField
              path="secrets.user"
              config={{
                label: i18n.USERNAME_LABEL,
                validations: [
                  {
                    validator: emptyField(i18n.USERNAME_REQUIRED),
                  },
                ],
              }}
              component={Field}
              componentProps={{
                euiFieldProps: { readOnly, 'data-test-subj': 'webhookUserInput', fullWidth: true },
              }}
            />
          </EuiFlexItem>
          <EuiFlexItem>
            <PasswordField
              path="secrets.password"
              label={i18n.PASSWORD_LABEL}
              readOnly={readOnly}
              data-test-subj="webhookPasswordInput"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      <EuiSpacer size="m" />
      <UseField
        path="__internal__.hasHeaders"
        component={ToggleField}
        config={{ defaultValue: hasHeadersDefaultValue, label: i18n.ADD_HEADERS_LABEL }}
        componentProps={{
          euiFieldProps: {
            disabled: readOnly,
            'data-test-subj': 'webhookViewHeadersSwitch',
          },
        }}
      />
      <EuiSpacer size="m" />
      {hasHeaders ? (
        <UseArray path="config.headers" initialNumberOfItems={1}>
          {({ items, addItem, removeItem }) => {
            return (
              <>
                {items.map((item) => (
                  <EuiFlexGroup key={item.id}>
                    <EuiFlexItem>
                      <UseField
                        path={`${item.path}.key`}
                        config={{
                          label: i18n.HEADER_KEY_LABEL,
                        }}
                        component={TextField}
                        // This is needed because when you delete
                        // a row and add a new one, the stale values will appear
                        readDefaultValueOnForm={!item.isNew}
                        componentProps={{
                          euiFieldProps: { readOnly },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <UseField
                        path={`${item.path}.value`}
                        config={{ label: i18n.HEADER_VALUE_LABEL }}
                        component={TextField}
                        readDefaultValueOnForm={!item.isNew}
                        componentProps={{
                          euiFieldProps: { readOnly },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        color="danger"
                        onClick={() => removeItem(item.id)}
                        iconType="minusInCircle"
                        aria-label={i18n.REMOVE_ITEM_LABEL}
                        style={{ marginTop: '28px' }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ))}
                <EuiSpacer size="m" />
                <EuiButtonEmpty iconType="plusInCircle" onClick={addItem}>
                  {i18n.ADD_HEADER_BTN}
                </EuiButtonEmpty>
                <EuiSpacer />
              </>
            );
          }}
        </UseArray>
      ) : null}
    </>
  );
};

// eslint-disable-next-line import/no-default-export
export { WebhookActionConnectorFields as default };
