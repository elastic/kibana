/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import React, { Fragment } from 'react';
import { EuiFieldNumber, EuiFieldText, EuiTextArea } from '@elastic/eui';
import { ErrableFormRow } from '../../../components/form_errors';

interface Props {
  action: any; // TODO fix
  // fields: Array<{
  //   required: boolean;
  //   fieldType: 'text' | 'textarea' | 'array' | 'number';
  //   fieldName: string;
  //   fieldLabel: string;
  // }>;
  editAction: (changedProperty: { key: string; value: string }) => void;
}

const FORM_CONTROLS = {
  text: EuiFieldText,
  textarea: EuiTextArea,
  array: EuiFieldText, // TODO replace with combo box?
  number: EuiFieldNumber,
};

export const ThresholdActionsFormBuilder: React.FunctionComponent<Props> = ({
  action,
  editAction,
}) => {
  const errors = action.validateAction();
  const hasErrors = !!Object.keys(errors).find(errorKey => errors[errorKey].length >= 1);
  return (
    <Fragment>
      {action.fields.map((field, index) => {
        const { required, fieldName, fieldLabel, fieldType } = field;
        const fieldValue = action[fieldName];
        if (required) {
          const FormControl = FORM_CONTROLS[fieldType];
          const currentValue = Array.isArray(fieldValue) ? fieldValue.join(', ') : fieldValue; // TODO cleanup/rename?
          return (
            <ErrableFormRow
              key={`${action.typeName}-${fieldName}-${index}`}
              id={`${action.typeName}-${fieldName}-${index}`}
              errorKey={fieldName}
              fullWidth
              errors={errors}
              isShowingErrors={hasErrors && fieldValue !== undefined}
              label={fieldLabel}
            >
              <FormControl
                fullWidth
                name={fieldName}
                value={currentValue || ''}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  let newValue = e.target.value;
                  if (fieldType === 'array') {
                    const toArray = (newValue || '').split(',').map(val => val.trim());
                    newValue = toArray.join(', ');
                  }
                  if (fieldType === 'number') {
                    newValue = parseInt(newValue, 10);
                  }
                  editAction({ key: fieldName, value: newValue });
                }}
                onBlur={() => {
                  if (!action[fieldName]) {
                    editAction({ key: fieldName, value: fieldType === 'array' ? [] : '' });
                  }
                }}
              />
            </ErrableFormRow>
          );
        }
        // TODO implement non-required form row
        return null;
      })}
    </Fragment>
  );
};
