/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { Field, SplitField } from '../../../../../../../../../common/types/fields';

interface DropDownLabel {
  label: string;
  field: Field;
}

interface Props {
  fields: Field[];
  changeHandler(f: SplitField): void;
  selectedField: SplitField;
  isClearable: boolean;
  testSubject?: string;
  placeholder?: string;
}

export const SplitFieldSelect: FC<Props> = ({
  fields,
  changeHandler,
  selectedField,
  isClearable,
  testSubject,
  placeholder,
}) => {
  const options: EuiComboBoxOptionOption[] = fields.map(
    (f) =>
      ({
        label: f.name,
        field: f,
      } as DropDownLabel)
  );

  const selection: EuiComboBoxOptionOption[] = [];
  if (selectedField !== null) {
    selection.push({ label: selectedField.name, field: selectedField } as DropDownLabel);
  }

  function onChange(selectedOptions: EuiComboBoxOptionOption[]) {
    const option = selectedOptions[0] as DropDownLabel;
    if (typeof option !== 'undefined') {
      changeHandler(option.field);
    } else {
      changeHandler(null);
    }
  }

  return (
    <EuiComboBox
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={isClearable}
      placeholder={placeholder}
      data-test-subj={testSubject}
    />
  );
};
