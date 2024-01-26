/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import {
  ComboBoxField,
  Field,
  PasswordField,
} from '@kbn/es-ui-shared-plugin/static/forms/components';
import { FIELD_TYPES, getUseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { i18n } from '@kbn/i18n';

export interface CommonFieldSchema {
  id: string;
  label: string;
  helpText?: string | ReactNode;
  isRequired?: boolean;
  type?: keyof typeof FIELD_TYPES;
  euiFieldProps?: Record<string, unknown>;
}

export interface ConfigFieldSchema extends CommonFieldSchema {
  isUrlField?: boolean;
  defaultValue?: string | string[];
}

export interface SecretsFieldSchema extends CommonFieldSchema {
  isPasswordField?: boolean;
}

interface SimpleConnectorFormProps {
  isEdit: boolean;
  readOnly: boolean;
  configFormSchema: ConfigFieldSchema[];
  secretsFormSchema: SecretsFieldSchema[];
  configFormSchemaAfterSecrets?: ConfigFieldSchema[];
}

type FormRowProps = ConfigFieldSchema & SecretsFieldSchema & { readOnly: boolean };

const UseTextField = getUseField({ component: Field });
const UseComboBoxField = getUseField({ component: ComboBoxField });
const { emptyField, urlField } = fieldValidators;

const getFieldConfig = ({
  label,
  isRequired = true,
  isUrlField = false,
  defaultValue,
  type,
}: {
  label: string;
  isRequired?: boolean;
  isUrlField?: boolean;
  defaultValue?: string | string[];
  type?: keyof typeof FIELD_TYPES;
}) => ({
  label,
  validations: [
    ...(isRequired
      ? [
          {
            validator: emptyField(
              i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorForm.error.requireFieldText',
                {
                  values: { label },
                  defaultMessage: `{label} is required.`,
                }
              )
            ),
          },
        ]
      : []),
    ...(isUrlField
      ? [
          {
            validator: urlField(
              i18n.translate(
                'xpack.triggersActionsUI.sections.actionConnectorForm.error.invalidURL',
                {
                  defaultMessage: 'Invalid URL',
                }
              )
            ),
          },
        ]
      : []),
  ],
  defaultValue,
  ...(type && FIELD_TYPES[type]
    ? { type: FIELD_TYPES[type], defaultValue: Array.isArray(defaultValue) ? defaultValue : [] }
    : {}),
});

const getComponentByType = (type?: keyof typeof FIELD_TYPES) => {
  let UseField = UseTextField;
  if (type && FIELD_TYPES[type] === FIELD_TYPES.COMBO_BOX) {
    UseField = UseComboBoxField;
  }
  return UseField;
};

const FormRow: React.FC<FormRowProps> = ({
  id,
  label,
  readOnly,
  isPasswordField,
  isRequired = true,
  isUrlField,
  helpText,
  defaultValue,
  euiFieldProps = {},
  type,
}) => {
  const dataTestSub = `${id}-input`;
  const UseField = getComponentByType(type);
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          {!isPasswordField ? (
            <UseField
              path={id}
              config={getFieldConfig({ label, isUrlField, defaultValue, type, isRequired })}
              helpText={helpText}
              componentProps={{
                euiFieldProps: {
                  ...euiFieldProps,
                  readOnly,
                  fullWidth: true,
                  'data-test-subj': dataTestSub,
                },
              }}
            />
          ) : (
            <UseField
              path={id}
              config={getFieldConfig({ label, type, isRequired })}
              helpText={helpText}
              component={PasswordField}
              componentProps={{
                euiFieldProps: {
                  ...euiFieldProps,
                  'data-test-subj': dataTestSub,
                  readOnly,
                },
              }}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const SimpleConnectorFormComponent: React.FC<SimpleConnectorFormProps> = ({
  isEdit,
  readOnly,
  configFormSchema,
  secretsFormSchema,
  configFormSchemaAfterSecrets = [],
}) => {
  return (
    <>
      {configFormSchema.map(({ id, ...restConfigSchema }, index) => (
        <React.Fragment key={`config.${id}`}>
          <FormRow id={`config.${id}`} {...restConfigSchema} readOnly={readOnly} />
          {index !== configFormSchema.length ? <EuiSpacer size="m" /> : null}
        </React.Fragment>
      ))}
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiTitle size="xxs">
            <h4>
              {i18n.translate(
                'xpack.triggersActionsUI.components.simpleConnectorForm.secrets.authenticationLabel',
                {
                  defaultMessage: 'Authentication',
                }
              )}
            </h4>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="m" />
      {secretsFormSchema.map(({ id, ...restSecretsSchema }, index) => (
        <React.Fragment key={`secrets.${id}`}>
          <FormRow
            id={`secrets.${id}`}
            key={`secrets.${id}`}
            {...restSecretsSchema}
            readOnly={readOnly}
          />
          {index !== secretsFormSchema.length ? <EuiSpacer size="m" /> : null}
        </React.Fragment>
      ))}
      {configFormSchemaAfterSecrets.map(({ id, ...restConfigSchemaAfterSecrets }, index) => (
        <React.Fragment key={`config.${id}`}>
          <FormRow id={`config.${id}`} {...restConfigSchemaAfterSecrets} readOnly={readOnly} />
          {index !== configFormSchemaAfterSecrets.length ? <EuiSpacer size="m" /> : null}
        </React.Fragment>
      ))}
    </>
  );
};

export const SimpleConnectorForm = memo(SimpleConnectorFormComponent);
