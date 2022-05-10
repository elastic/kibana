/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import {
  EuiFieldPassword,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import {
  getFieldValidityAndErrorMessage,
  getUseField,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { i18n } from '@kbn/i18n';
import { getEncryptedFieldNotifyLabel } from './get_encrypted_field_notify_label';

export interface ConfigFieldSchema {
  id: string;
  label: string;
}

export interface SecretsFieldSchema extends ConfigFieldSchema {
  password?: boolean;
}

interface SimpleConnectorFormProps {
  isEdit: boolean;
  readOnly: boolean;
  configFormSchema: ConfigFieldSchema[];
  secretsFormSchema: SecretsFieldSchema[];
}

interface FormRowProps {
  id: string;
  label: string;
  readOnly: boolean;
  password?: boolean;
}

const UseField = getUseField({ component: Field });
const { emptyField } = fieldValidators;

const PasswordField: React.FC<FormRowProps> = ({ id, label, readOnly }) => {
  return (
    <UseField<string> path={id} config={getFieldConfig({ label })}>
      {(field) => {
        const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);

        return (
          <EuiFormRow
            label={field.label}
            labelAppend={field.labelAppend}
            helpText={typeof field.helpText === 'function' ? field.helpText() : field.helpText}
            error={errorMessage}
            isInvalid={isInvalid}
            fullWidth
          >
            <EuiFieldPassword
              isInvalid={isInvalid}
              value={field.value as string}
              onChange={field.onChange}
              isLoading={field.isValidating}
              fullWidth
              readOnly={readOnly}
            />
          </EuiFormRow>
        );
      }}
    </UseField>
  );
};

const getFieldConfig = ({ label }: { label: string }) => ({
  label,
  validations: [
    {
      validator: emptyField(
        i18n.translate(
          'xpack.triggersActionsUI.sections.actionConnectorForm.error.requiredNameText',
          {
            defaultMessage: `${label} is required.`,
          }
        )
      ),
    },
  ],
});

const FormRow: React.FC<FormRowProps> = ({ id, label, readOnly, password }) => {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          {!password ? (
            <UseField
              path={id}
              config={getFieldConfig({ label })}
              componentProps={{
                euiFieldProps: { readOnly, fullWidth: true },
              }}
            />
          ) : (
            <PasswordField id={id} label={label} readOnly={readOnly} />
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
}) => {
  return (
    <>
      {configFormSchema.map(({ id, label }, index) => (
        <>
          <FormRow id={`config.${id}`} label={label} readOnly={readOnly} />
          {index !== configFormSchema.length ? <EuiSpacer size="m" /> : null}
        </>
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
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow fullWidth>
            {getEncryptedFieldNotifyLabel(
              !isEdit,
              secretsFormSchema.length,
              // TODO: Pass isMissingSecrets from connector
              false,
              i18n.translate(
                'xpack.triggersActionsUI.components.simpleConnectorForm.secrets.reenterValuesLabel',
                {
                  defaultMessage:
                    'Authentication credentials are encrypted. Please reenter values for these fields.',
                }
              )
            )}
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
      {secretsFormSchema.map(({ id, label, password }, index) => (
        <>
          <FormRow id={`secrets.${id}`} label={label} readOnly={readOnly} password={password} />
          {index !== secretsFormSchema.length ? <EuiSpacer size="m" /> : null}
        </>
      ))}
    </>
  );
};

export const SimpleConnectorForm = memo(SimpleConnectorFormComponent);
