/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FC } from 'react';
import { EuiComboBox, EuiComboBoxOptionProps } from '@elastic/eui';

import { Field, SplitField } from '../../../../../../../../common/types/fields';
import { JOB_TYPE } from '../../../../../common/job_creator/util/constants';
import { Description } from './description';

interface DropDownLabel {
  label: string;
  field: Field;
}

interface Props {
  fields: Field[];
  changeHandler(f: SplitField): void;
  selectedField: SplitField;
  jobType: JOB_TYPE;
}

export const SplitFieldSelect: FC<Props> = ({ fields, changeHandler, selectedField, jobType }) => {
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
    <Description jobType={jobType}>
      <EuiComboBox
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selection}
        onChange={onChange}
        isClearable={true}
      />
    </Description>
  );
};
