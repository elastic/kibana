/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';

import type { Field } from '@kbn/ml-anomaly-utils';
import { JobCreatorContext } from '../../../job_creator_context';
import { createFieldOptions } from '../../../../../common/job_creator/util/general';

interface Props {
  fields: Field[];
  changeHandler(i: string): void;
  selectedField: string;
}

export const TimeFieldSelect: FC<Props> = ({ fields, changeHandler, selectedField }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const options: EuiComboBoxOptionOption[] = createFieldOptions(
    fields,
    jobCreator.additionalFields
  );

  const selection: EuiComboBoxOptionOption[] = [];
  if (selectedField !== null) {
    selection.push({ label: selectedField });
  }

  function onChange(selectedOptions: EuiComboBoxOptionOption[]) {
    const option = selectedOptions[0];
    if (typeof option !== 'undefined') {
      changeHandler(option.label);
    }
  }

  return (
    <EuiComboBox
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={false}
      data-test-subj="mlTimeFieldNameSelect"
    />
  );
};
