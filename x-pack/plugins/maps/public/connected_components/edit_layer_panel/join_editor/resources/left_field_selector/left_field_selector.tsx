/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';

import { EuiFormRow, EuiComboBox } from '@elastic/eui';
import { JoinField } from '../..';
import { inputStrings } from '../../../../input_strings';

interface LeftFieldSelectorProps {
  // Left source props (static - can not change)
  leftSourceName?: string;

  // Left field props
  leftValue?: string;
  leftFields: JoinField[];
  onLeftFieldChange: (leftField: string) => void;
}

export function LeftFieldSelector(props: LeftFieldSelectorProps) {
  function onLeftFieldChange(selectedFields: Array<EuiComboBoxOptionOption<JoinField>>) {
    const leftField = selectedFields?.[0]?.value?.name;
    if (leftField) {
      props.onLeftFieldChange(leftField);
    }
  }

  function renderLeftFieldSelect() {
    if (!props.leftFields) {
      return null;
    }

    const options = props.leftFields.map((field) => {
      return {
        value: field,
        label: field.label,
      };
    });

    let leftFieldOption;
    if (props.leftValue) {
      leftFieldOption = options.find((option) => {
        const field = option.value;
        return field.name === props.leftValue;
      });
    }
    const selectedOptions = leftFieldOption ? [leftFieldOption] : [];

    return (
      <EuiFormRow
        label={i18n.translate('xpack.maps.termJoinExpression.leftFieldLabel', {
          defaultMessage: 'Left field',
        })}
        helpText={i18n.translate('xpack.maps.termJoinExpression.leftSourceLabelHelpText', {
          defaultMessage: 'Left source field that contains the shared key.',
        })}
      >
        <EuiComboBox
          placeholder={inputStrings.fieldSelectPlaceholder}
          singleSelection={true}
          isClearable={false}
          options={options}
          selectedOptions={selectedOptions}
          onChange={onLeftFieldChange}
        />
      </EuiFormRow>
    );
  }

  return (
    <>
      <EuiFormRow
        label={i18n.translate('xpack.maps.termJoinExpression.leftSourceLabel', {
          defaultMessage: 'Left source',
        })}
      >
        <EuiComboBox
          selectedOptions={
            props.leftSourceName
              ? [{ value: props.leftSourceName, label: props.leftSourceName }]
              : []
          }
          isDisabled
        />
      </EuiFormRow>
      {renderLeftFieldSelect()}
    </>
  );
}
