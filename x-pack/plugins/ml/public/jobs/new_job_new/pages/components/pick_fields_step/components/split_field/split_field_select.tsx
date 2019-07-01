/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, FC } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionProps,
  EuiDescribedFormGroup,
  EuiFormRow,
} from '@elastic/eui';

import { Field, SplitField } from '../../../../../../../../common/types/fields';

interface DropDownLabel {
  label: string;
  field: Field;
}

interface Props {
  fields: Field[];
  changeHandler(f: SplitField): void;
  selectedField: SplitField;
}

export const SplitFieldSelect: FC<Props> = ({ fields, changeHandler, selectedField }) => {
  const options: EuiComboBoxOptionProps[] = fields.map(
    f =>
      ({
        label: f.name,
        field: f,
      } as DropDownLabel)
  );

  const selection: EuiComboBoxOptionProps[] = [];
  if (selectedField !== null) {
    selection.push({ label: selectedField.name, field: selectedField } as DropDownLabel);
  }

  function onChange(selectedOptions: EuiComboBoxOptionProps[]) {
    const option = selectedOptions[0] as DropDownLabel;
    if (typeof option !== 'undefined') {
      changeHandler(option.field);
    } else {
      changeHandler(null);
    }
  }

  return (
    <EuiDescribedFormGroup
      idAria="single-example-aria"
      title={<h3>Split field</h3>}
      description={
        <Fragment>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt
          ut labore et dolore magna aliqua. Ut enim ad minim veniam.
        </Fragment>
      }
    >
      <EuiFormRow label="Split field" describedByIds={['single-example-aria']}>
        <EuiComboBox
          singleSelection={{ asPlainText: true }}
          options={options}
          selectedOptions={selection}
          onChange={onChange}
          isClearable={true}
        />
      </EuiFormRow>
    </EuiDescribedFormGroup>
  );
};
