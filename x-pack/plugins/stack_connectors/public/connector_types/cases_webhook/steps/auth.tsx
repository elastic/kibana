/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FunctionComponent } from 'react';
import {
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import {
  FIELD_TYPES,
  UseArray,
  UseField,
  useFormContext,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { Field, TextField } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { PasswordField } from '@kbn/triggers-actions-ui-plugin/public';
import * as i18n from '../translations';
const { emptyField } = fieldValidators;

interface Props {
  display: boolean;
  readOnly: boolean;
}

export const AuthStep: FunctionComponent<Props> = ({ display, readOnly }) => {
  const { getFieldDefaultValue } = useFormContext();
  const [{ config, __internal__ }] = useFormData({
    watch: ['config.hasAuth', '__internal__.hasHeaders'],
  });

  const hasHeadersDefaultValue = !!getFieldDefaultValue<boolean | undefined>('config.headers');

  const hasAuth = config == null ? true : config.hasAuth;
  const hasHeaders = __internal__ != null ? __internal__.hasHeaders : false;

  return (
    <span data-test-subj="authStep" style={{ display: display ? 'block' : 'none' }}>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>{i18n.AUTH_TITLE}</h4>
          </EuiTitle>
          <EuiSpacer size="m" />
          <UseField
            path="config.hasAuth"
            component={Field}
            config={{ defaultValue: true, type: FIELD_TYPES.TOGGLE }}
            componentProps={{
              euiFieldProps: {
                label: i18n.HAS_AUTH,
                disabled: readOnly,
                'data-test-subj': 'hasAuthToggle',
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
                label: i18n.USERNAME,
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
              label={i18n.PASSWORD}
              readOnly={readOnly}
              data-test-subj="webhookPasswordInput"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      ) : null}
      <EuiSpacer size="m" />
      <UseField
        path="__internal__.hasHeaders"
        component={Field}
        config={{
          defaultValue: hasHeadersDefaultValue,
          label: i18n.HEADERS_SWITCH,
          type: FIELD_TYPES.TOGGLE,
        }}
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
                <EuiTitle size="xxs" data-test-subj="webhookHeaderText">
                  <h5>{i18n.HEADERS_TITLE}</h5>
                </EuiTitle>
                <EuiSpacer size="s" />
                {items.map((item) => (
                  <EuiFlexGroup key={item.id}>
                    <EuiFlexItem>
                      <UseField
                        path={`${item.path}.key`}
                        config={{
                          label: i18n.KEY_LABEL,
                        }}
                        component={TextField}
                        // This is needed because when you delete
                        // a row and add a new one, the stale values will appear
                        readDefaultValueOnForm={!item.isNew}
                        componentProps={{
                          euiFieldProps: { readOnly, ['data-test-subj']: 'webhookHeadersKeyInput' },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem>
                      <UseField
                        path={`${item.path}.value`}
                        config={{ label: i18n.VALUE_LABEL }}
                        component={TextField}
                        readDefaultValueOnForm={!item.isNew}
                        componentProps={{
                          euiFieldProps: {
                            readOnly,
                            ['data-test-subj']: 'webhookHeadersValueInput',
                          },
                        }}
                      />
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiButtonIcon
                        color="danger"
                        onClick={() => removeItem(item.id)}
                        iconType="minusInCircle"
                        aria-label={i18n.DELETE_BUTTON}
                        style={{ marginTop: '28px' }}
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                ))}
                <EuiSpacer size="m" />
                <EuiButtonEmpty
                  iconType="plusInCircle"
                  onClick={addItem}
                  data-test-subj="webhookAddHeaderButton"
                >
                  {i18n.ADD_BUTTON}
                </EuiButtonEmpty>
                <EuiSpacer />
              </>
            );
          }}
        </UseArray>
      ) : null}
    </span>
  );
};
