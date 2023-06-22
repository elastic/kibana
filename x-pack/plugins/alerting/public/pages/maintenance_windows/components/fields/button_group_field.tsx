/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonGroup, EuiButtonGroupOptionProps, EuiFormRow } from '@elastic/eui';
import {
  useFormData,
  useFormContext,
  FieldHook,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { get } from 'lodash';

interface ButtonGroupFieldProps {
  field: FieldHook;
  legend: string;
  options: EuiButtonGroupOptionProps[];
  type?: 'single' | 'multi';
  'data-test-subj'?: string;
}

export const ButtonGroupField: React.FC<ButtonGroupFieldProps> = React.memo(
  ({ field, legend, options, type = 'single', ...rest }) => {
    const { setFieldValue } = useFormContext();
    const [formData] = useFormData({ watch: [field.path] });
    const selected = get(formData, field.path);

    const onChange = useCallback(
      (current: string) => {
        setFieldValue(field.path, current);
      },
      [setFieldValue, field.path]
    );

    const onChangeMulti = useCallback(
      (current: string) => {
        const newSelectedValue = { ...selected, [current]: !selected[current] };
        // Don't allow the user to deselect all options
        if (!Object.values(newSelectedValue).every((v) => v === false)) {
          setFieldValue(field.path, newSelectedValue);
        }
      },
      [setFieldValue, selected, field.path]
    );

    return (
      <EuiFormRow label={field.label} {...rest} fullWidth>
        {type === 'multi' ? (
          <EuiButtonGroup
            isFullWidth
            legend={legend}
            onChange={onChangeMulti}
            idToSelectedMap={selected}
            options={options}
            type="multi"
          />
        ) : (
          <EuiButtonGroup
            isFullWidth
            legend={legend}
            onChange={onChange}
            idSelected={selected}
            options={options}
            type="single"
          />
        )}
      </EuiFormRow>
    );
  }
);
ButtonGroupField.displayName = 'ButtonGroupField';
