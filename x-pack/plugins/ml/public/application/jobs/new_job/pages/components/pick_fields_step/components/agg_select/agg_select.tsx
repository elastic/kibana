/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useContext, useState, useEffect, ReactNode } from 'react';
import {
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFormRow,
  EuiFlexItem,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiHighlight,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { MLJobWizardFieldStatsFlyoutContext } from '../field_stats_flyout/field_stats_flyout';
import { JobCreatorContext } from '../../../job_creator_context';
import { Field, Aggregation, AggFieldPair } from '../../../../../../../../../common/types/fields';

// The display label used for an aggregation e.g. sum(bytes).
export type Label = string;

// Label object structured for EUI's ComboBox.
export interface DropDownLabel {
  label: Label;
  agg: Aggregation;
  field: Field;
}

// Label object structure for EUI's ComboBox with support for nesting.
export interface DropDownOption {
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
  const { setIsFlyoutVisible, setFieldName } = useContext(MLJobWizardFieldStatsFlyoutContext);

  const [validation, setValidation] = useState(jobValidator.duplicateDetectors);
  // create list of labels based on already selected detectors
  // so they can be removed from the dropdown list
  const removeLabels = removeOptions.map(createLabel);

  const options: EuiComboBoxOptionOption[] = fields.map((f) => {
    const aggOption: DropDownOption = { label: f.name, options: [] };
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
  });

  useEffect(() => {
    setValidation(jobValidator.duplicateDetectors);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobValidatorUpdated]);

  const renderOption = (option: EuiComboBoxOptionOption, searchValue: string): ReactNode => {
    const field = (option as DropDownLabel).field;
    return option.isGroupLabelOption || !field ? (
      option.label
    ) : (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <FieldIcon type={field.type} fill="none" />
        </EuiFlexItem>
        <EuiFlexItem grow={true}>
          <EuiHighlight search={searchValue}>{option.label}</EuiHighlight>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="inspect"
            onClick={(ev: React.MouseEvent<HTMLButtonElement>) => {
              if (ev.type === 'click') {
                ev.currentTarget.focus();
              }
              ev.preventDefault();
              ev.stopPropagation();

              if (typeof field.id === 'string') {
                setFieldName(field.id);
                setIsFlyoutVisible(true);
              }
            }}
            aria-label={i18n.translate('xpack.ml.fieldContextPopover.topFieldValuesAriaLabel', {
              defaultMessage: 'Show top 10 field values',
            })}
            data-test-subj={'mlAggSelectFieldStatsPopoverButton'}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

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
        // @todo: remove
        renderOption={renderOption}
      />
    </EuiFormRow>
  );
};

export function createLabel(pair: AggFieldPair): string {
  return `${pair.agg.title}(${pair.field.name})`;
}
