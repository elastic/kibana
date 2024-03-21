/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useCallback, useContext, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox } from '@elastic/eui';

import type { Field } from '@kbn/ml-anomaly-utils';
import { useFieldStatsTrigger } from '../../../../../../../components/field_stats_flyout/use_field_stats_trigger';
import { JobCreatorContext } from '../../../job_creator_context';
import { createFieldOptions } from '../../../../../common/job_creator/util/general';

interface Props {
  fields: Field[];
  changeHandler(i: string | null): void;
  selectedField: string | null;
}

export const CategorizationPerPartitionFieldSelect: FC<Props> = ({
  fields,
  changeHandler,
  selectedField,
}) => {
  const { jobCreator, jobCreatorUpdated } = useContext(JobCreatorContext);
  const { renderOption, optionCss } = useFieldStatsTrigger();

  const options: EuiComboBoxOptionOption[] = useMemo(
    () =>
      [...createFieldOptions(fields, jobCreator.additionalFields)].map((o) => ({
        ...o,
        css: optionCss,
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fields, jobCreatorUpdated]
  );

  const selection: EuiComboBoxOptionOption[] = useMemo(() => {
    const selectedOptions: EuiComboBoxOptionOption[] = [];
    if (selectedField !== null) {
      selectedOptions.push({ label: selectedField });
    }
    return selectedOptions;
  }, [selectedField]);

  const onChange = useCallback(
    (selectedOptions: EuiComboBoxOptionOption[]) =>
      changeHandler((selectedOptions[0] && selectedOptions[0].label) ?? null),
    [changeHandler]
  );

  return (
    <EuiComboBox
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={true}
      data-test-subj="mlJobWizardCategorizationPerPartitionFieldNameSelect"
      renderOption={renderOption}
    />
  );
};
