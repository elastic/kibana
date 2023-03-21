/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, ReactNode } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiTitle } from '@elastic/eui';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { getUseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { i18n } from '@kbn/i18n';
import { PasswordField } from './password_field';

export interface CommonFieldSchema {
  id: string;
  label: string;
  helpText?: string | ReactNode;
}

export interface ConfigFieldSchema extends CommonFieldSchema {
  isUrlField?: boolean;
  defaultValue?: string;
}

export interface SecretsFieldSchema extends CommonFieldSchema {
  isPasswordField?: boolean;
}

interface SimpleConnectorFormProps {
  isEdit: boolean;
  readOnly: boolean;
  configFormSchema: ConfigFieldSchema[];
  secretsFormSchema: SecretsFieldSchema[];
}

type FormRowProps = ConfigFieldSchema & SecretsFieldSchema & { readOnly: boolean };

const UseField = getUseField({ component: Field });
const { emptyField, urlField } = fieldValidators;

const getFieldConfig = ({
  label,
  isUrlField = false,
  defaultValue,
}: {
  label: string;
  isUrlField?: boolean;
  defaultValue?: string;
}) => ({
  label,
  validations: [
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
});

const FormRow: React.FC<FormRowProps> = ({
  id,
  label,
  readOnly,
  isPasswordField,
  isUrlField,
  helpText,
  defaultValue,
}) => {
  const dataTestSub = `${id}-input`;
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          {!isPasswordField ? (
            <UseField
              path={id}
              config={getFieldConfig({ label, isUrlField, defaultValue })}
              helpText={helpText}
              componentProps={{
                euiFieldProps: { readOnly, fullWidth: true, 'data-test-subj': dataTestSub },
              }}
            />
          ) : (
            <PasswordField
              path={id}
              label={label}
              readOnly={readOnly}
              data-test-subj={dataTestSub}
              helpText={helpText}
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
    </>
  );
};

export const SimpleConnectorForm = memo(SimpleConnectorFormComponent);
