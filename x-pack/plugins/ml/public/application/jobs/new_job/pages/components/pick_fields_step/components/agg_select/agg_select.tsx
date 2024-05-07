/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC } from 'react';
import React, { useContext, useState, useEffect, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFormRow } from '@elastic/eui';
import type { Field, Aggregation, AggFieldPair } from '@kbn/ml-anomaly-utils';
import { EVENT_RATE_FIELD_ID } from '@kbn/ml-anomaly-utils';
import { FieldStatsInfoButton } from '../../../../../../../components/field_stats_flyout/field_stats_info_button';
import { JobCreatorContext } from '../../../job_creator_context';
import { useFieldStatsTrigger } from '../../../../../../../components/field_stats_flyout/use_field_stats_trigger';

// The display label used for an aggregation e.g. sum(bytes).
export type Label = string;

// Label object structured for EUI's ComboBox.
export interface DropDownLabel {
  label: Label;
  agg: Aggregation;
  field: Field;
}

// Label object structure for EUI's ComboBox with support for nesting.
export interface DropDownOption extends EuiComboBoxOptionOption {
  label: Label;
  options: DropDownLabel[];
}

export type DropDownProps = DropDownLabel[] | EuiComboBoxOptionOption[];

interface Props {
  fields: Field[];
  changeHandler(d: EuiComboBoxOptionOption[]): void;
  selectedOptions: EuiComboBoxOptionOption[];
  removeOptions: AggFieldPair[];
}

export const AggSelect: FC<Props> = ({ fields, changeHandler, selectedOptions, removeOptions }) => {
  const { jobValidator, jobValidatorUpdated } = useContext(JobCreatorContext);
  const [validation, setValidation] = useState(jobValidator.duplicateDetectors);
  // create list of labels based on already selected detectors
  // so they can be removed from the dropdown list
  const removeLabels = removeOptions.map(createLabel);
  const { handleFieldStatsButtonClick, populatedFields } = useFieldStatsTrigger();

  const options: EuiComboBoxOptionOption[] = useMemo(
    () =>
      fields.map((f) => {
        const aggOption: DropDownOption = {
          isGroupLabelOption: true,
          key: f.name,
          // @ts-ignore Purposefully passing label as element instead of string
          // for more robust rendering
          label: (
            <FieldStatsInfoButton
              hideTrigger={f.id === EVENT_RATE_FIELD_ID}
              isEmpty={f.id === EVENT_RATE_FIELD_ID ? false : !populatedFields?.has(f.name)}
              field={f}
              label={f.name}
              onButtonClick={handleFieldStatsButtonClick}
            />
          ),
          options: [],
        };
        if (typeof f.aggs !== 'undefined') {
          aggOption.options = f.aggs
            .filter((a) => a.dslName !== null) // don't include aggs which have no ES equivalent
            .map(
              (a) =>
                ({
                  label: `${a.title}(${f.name})`,
                  agg: a,
                  field: f,
                } as DropDownLabel)
            )
            .filter((o) => removeLabels.includes(o.label) === false);
        }
        return aggOption;
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleFieldStatsButtonClick, fields, removeLabels, populatedFields?.size]
  );

  useEffect(() => {
    setValidation(jobValidator.duplicateDetectors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobValidatorUpdated]);

  return (
    <EuiFormRow
      error={validation.message}
      isInvalid={validation.valid === false}
      data-test-subj="mlJobWizardAggSelection"
    >
      <EuiComboBox
        singleSelection={{ asPlainText: true }}
        options={options}
        selectedOptions={selectedOptions}
        onChange={changeHandler}
        isClearable={false}
        isInvalid={validation.valid === false}
      />
    </EuiFormRow>
  );
};

export function createLabel(pair: AggFieldPair): string {
  return `${pair.agg.title}(${pair.field.name})`;
}
