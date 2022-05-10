/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import { Field } from '@kbn/es-ui-shared-plugin/static/forms/components';
import { getUseField } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { fieldValidators } from '@kbn/es-ui-shared-plugin/static/forms/helpers';
import { i18n } from '@kbn/i18n';
import { getEncryptedFieldNotifyLabel } from './get_encrypted_field_notify_label';

interface FieldSchema {
  id: string;
  label: string;
}

interface SimpleConnectorFormProps {
  isEdit: boolean;
  readOnly: boolean;
  configFormSchema: FieldSchema[];
  secretsFormSchema: FieldSchema[];
}

interface FormRowProps {
  id: string;
  label: string;
  readOnly: boolean;
}

const UseField = getUseField({ component: Field });
const { emptyField } = fieldValidators;

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

const FormRow = ({ id, label, readOnly }: FormRowProps) => {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <UseField
            path={id}
            config={getFieldConfig({ label })}
            componentProps={{
              euiFieldProps: { readOnly, fullWidth: true },
            }}
          />
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
      {secretsFormSchema.map(({ id, label }, index) => (
        <>
          <FormRow id={`secrets.${id}`} label={label} readOnly={readOnly} />
          {index !== secretsFormSchema.length ? <EuiSpacer size="m" /> : null}
        </>
      ))}
    </>
  );
};

export const SimpleConnectorForm = memo(SimpleConnectorFormComponent);
