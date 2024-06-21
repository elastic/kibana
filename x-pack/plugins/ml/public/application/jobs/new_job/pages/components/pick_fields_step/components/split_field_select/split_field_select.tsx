/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React from 'react';

import type { Field, SplitField } from '@kbn/ml-anomaly-utils';
import type { DropDownLabel } from '../../../../../../../components/field_stats_flyout/eui_combo_box_with_field_stats';
import { EuiComboBoxWithFieldStats } from '../../../../../../../components/field_stats_flyout';

interface Props {
  fields: Field[];
  changeHandler(f: SplitField | null): void;
  selectedField: SplitField | null;
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
  const options = fields.map(
    (f) =>
      ({
        label: f.name,
        field: f,
      } as DropDownLabel)
  );

  const selection: DropDownLabel[] = [];
  if (selectedField !== null) {
    selection.push({ label: selectedField.name, field: selectedField } as DropDownLabel);
  }

  function onChange(selectedOptions: DropDownLabel[]) {
    const option = selectedOptions[0] as DropDownLabel;
    if (typeof option?.field !== 'undefined') {
      changeHandler(option.field);
    } else {
      changeHandler(null);
    }
  }

  return (
    <EuiComboBoxWithFieldStats
      singleSelection={true}
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={isClearable}
      placeholder={placeholder}
      data-test-subj={testSubject}
    />
  );
};
