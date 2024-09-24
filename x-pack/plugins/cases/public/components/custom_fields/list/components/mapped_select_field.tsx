/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, OptionHTMLAttributes } from 'react';
import React, { useMemo } from 'react';
import { EuiFormRow, EuiSelect } from '@elastic/eui';

import {
  getFieldValidityAndErrorMessage,
  type FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';

export interface Props {
  field: FieldHook;
  euiFieldProps: {
    options: Array<
      { text: string | ReactNode; [key: string]: unknown } & OptionHTMLAttributes<HTMLOptionElement>
    >;
    [key: string]: unknown;
  };
  idAria?: string;
  [key: string]: unknown;
  onChangeKey: (key: string) => void;
}

/*
 * This component is used to render a select field which maps the EuiSelectOption `text` to the field value,
 * while emitting the EuiSelectOption `value` on change to be used as a key. This allows us to store the custom field
 * state with the schema: { key: 'customFieldKey.selectedOptionKey', value: 'Text of selected option' }
 */

// eslint-disable-next-line react/display-name
export const MappedSelectField = ({
  field,
  euiFieldProps,
  idAria,
  onChangeKey,
  ...rest
}: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { options } = euiFieldProps;

  const currentKey = useMemo(() => field.path.split('.').pop(), [field.path]);

  return (
    <EuiFormRow
      label={field.label}
      helpText={field.helpText}
      error={errorMessage}
      isInvalid={isInvalid}
      fullWidth
      describedByIds={idAria ? [idAria] : undefined}
      {...rest}
    >
      <EuiSelect
        fullWidth
        value={currentKey}
        onChange={(e) => {
          const newValue = options.find((option) => option.value === e.target.value)?.text;
          field.setValue(newValue);
          onChangeKey(e.target.value);
        }}
        hasNoInitialSelection={true}
        isInvalid={isInvalid}
        data-test-subj="select"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
