/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext } from 'react';
import { EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';

import { useFieldStatsTrigger } from '../../../../../utils/use_field_stats_trigger';
import { JobCreatorContext } from '../../../job_creator_context';
import { Field } from '../../../../../../../../../common/types/fields';
import {
  createFieldOptions,
  createMlcategoryFieldOption,
} from '../../../../../common/job_creator/util/general';

interface Props {
  fields: Field[];
  changeHandler(i: string[]): void;
  selectedInfluencers: string[];
}

export const InfluencersSelect: FC<Props> = ({ fields, changeHandler, selectedInfluencers }) => {
  const { jobCreator } = useContext(JobCreatorContext);
  const { renderOption, optionCss } = useFieldStatsTrigger();

  const options: EuiComboBoxOptionOption[] = [
    ...createFieldOptions(fields, jobCreator.additionalFields),
    ...createMlcategoryFieldOption(jobCreator.categorizationFieldName),
  ].map((o) => ({ ...o, css: optionCss }));

  const selection: EuiComboBoxOptionOption[] = selectedInfluencers.map((i) => ({ label: i }));

  function onChange(selectedOptions: EuiComboBoxOptionOption[]) {
    changeHandler(selectedOptions.map((o) => o.label));
  }

  return (
    <EuiComboBox
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={false}
      data-test-subj="mlInfluencerSelect"
      renderOption={renderOption}
    />
  );
};
