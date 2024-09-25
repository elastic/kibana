/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode, OptionHTMLAttributes } from 'react';
import React from 'react';
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
}

/*
 * This component is used to render a select field which emits [value, text] pairs from the chosen EuiSelectOption
 */

// eslint-disable-next-line react/display-name
export const MappedSelectField = ({ field, euiFieldProps, idAria, ...rest }: Props) => {
  const { isInvalid, errorMessage } = getFieldValidityAndErrorMessage(field);
  const { options } = euiFieldProps;

  const [key] = field.value as string[];

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
        value={key}
        onChange={(e) => {
          const label = options.find((option) => option.value === e.target.value)?.text;
          field.setValue([e.target.value, label]);
        }}
        hasNoInitialSelection={true}
        isInvalid={isInvalid}
        data-test-subj="select"
        {...euiFieldProps}
      />
    </EuiFormRow>
  );
};
