/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, ReactNode, useContext } from 'react';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
} from '@elastic/eui';

import { i18n } from '@kbn/i18n';
import { MLJobWizardFieldStatsFlyoutContext } from '../field_stats_flyout/field_stats_flyout';
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
  const { setIsFlyoutVisible, setFieldName } = useContext(MLJobWizardFieldStatsFlyoutContext);

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

  const renderOption = (option: EuiComboBoxOptionOption, searchValue: string): ReactNode => {
    const field = (option as DropDownLabel).field;
    return option.isGroupLabelOption || !field ? (
      option.label
    ) : (
      <EuiFlexGroup gutterSize="s" alignItems="center">
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
    <EuiComboBox
      singleSelection={{ asPlainText: true }}
      options={options}
      selectedOptions={selection}
      onChange={onChange}
      isClearable={isClearable}
      placeholder={placeholder}
      data-test-subj={testSubject}
      renderOption={renderOption}
    />
  );
};
