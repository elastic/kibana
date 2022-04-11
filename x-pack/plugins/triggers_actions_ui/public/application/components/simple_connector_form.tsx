/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiFormRow, EuiFieldText, EuiSpacer } from '@elastic/eui';
import React, { memo } from 'react';
import { ActionConnectorFieldsProps, IErrorObject } from '../../types';

interface FieldSchema {
  id: string;
  label: string;
}

interface FormSchema {
  configFormSchema: FieldSchema[];
  secretsFormSchema: FieldSchema[];
}

interface FormRowProps {
  id: string;
  value: string;
  error: string | string[] | IErrorObject;
  isInvalid: boolean;
  label: string;
  readOnly: boolean;
  action: (property: string, value: unknown) => void;
}

const isInvalidField = (key: string, field: string, errors: IErrorObject) =>
  field !== undefined && errors[key] !== undefined && errors[key].length > 0;

const FormRow = ({ id, value, error, isInvalid, label, readOnly, action }: FormRowProps) => {
  return (
    <>
      <EuiFlexGroup>
        <EuiFlexItem>
          <EuiFormRow id={id} fullWidth error={error} isInvalid={isInvalid} label={label}>
            <EuiFieldText
              fullWidth
              isInvalid={isInvalid}
              name={id}
              readOnly={readOnly}
              value={value} // Needed to prevent uncontrolled input error when value is undefined
              data-test-subj={`${id}FromInput`}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                action(id, e.target.value);
              }}
              onBlur={() => {
                if (!value) {
                  action(id, '');
                }
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  );
};

const ConnectorFormComponent = <Connector,>({
  action,
  editActionSecrets,
  editActionConfig,
  errors,
  readOnly,
  configFormSchema,
  secretsFormSchema,
}: ActionConnectorFieldsProps<Connector> & FormSchema) => {
  const { config, secrets } = action as unknown as {
    config: Record<string, string>;
    secrets: Record<string, string>;
  };

  return (
    <>
      {configFormSchema.map(({ id, label }, index) => (
        <>
          <FormRow
            id={id}
            error={errors[id]}
            isInvalid={isInvalidField(config[id], id, errors)}
            label={label}
            action={editActionConfig}
            value={config[id] || ''} // Needed to prevent uncontrolled input error when value is undefined
            readOnly={readOnly}
          />
          {index !== configFormSchema.length ? <EuiSpacer size="m" /> : null}
        </>
      ))}
      {secretsFormSchema.map(({ id, label }, index) => (
        <>
          <FormRow
            id={id}
            error={errors[id]}
            isInvalid={isInvalidField(secrets[id], id, errors)}
            label={label}
            action={editActionSecrets}
            value={secrets[id] || ''} // Needed to prevent uncontrolled input error when value is undefined
            readOnly={readOnly}
          />
          {index !== secretsFormSchema.length ? <EuiSpacer size="m" /> : null}
        </>
      ))}
    </>
  );
};

export const SimpleConnectorForm = memo(ConnectorFormComponent);
