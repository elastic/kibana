/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiForm,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';

import { dictionaryToArray } from '../../../../common/types/common';

import {
  AggName,
  isAggName,
  PivotAggsConfig,
  PivotAggsConfigDict,
  PIVOT_SUPPORTED_AGGS,
} from '../../common';

interface SelectOption {
  text: string;
}

interface Props {
  defaultData: PivotAggsConfig;
  otherAggNames: AggName[];
  options: PivotAggsConfigDict;
  onChange(d: PivotAggsConfig): void;
}

export const PopoverForm: React.SFC<Props> = ({
  defaultData,
  otherAggNames,
  onChange,
  options,
}) => {
  const [aggName, setAggName] = useState(defaultData.aggName);
  const [agg, setAgg] = useState(defaultData.agg);
  const [field, setField] = useState(defaultData.field);

  const optionsArr = dictionaryToArray(options);
  const availableFields: SelectOption[] = optionsArr
    .filter(o => o.agg === defaultData.agg)
    .map(o => {
      return { text: o.field };
    });
  const availableAggs: SelectOption[] = optionsArr
    .filter(o => o.field === defaultData.field)
    .map(o => {
      return { text: o.agg };
    });

  let aggNameError = '';

  let validAggName = isAggName(aggName);
  if (!validAggName) {
    aggNameError = i18n.translate('xpack.ml.dataframe.popoverForm.aggNameInvalidCharError', {
      defaultMessage: 'Invalid name. The characters "[", "]", and ">" are not allowed.',
    });
  }

  if (validAggName) {
    validAggName = !otherAggNames.includes(aggName);
    aggNameError = i18n.translate('xpack.ml.dataframe.popoverForm.aggNameAlreadyUsedError', {
      defaultMessage: 'Another aggregation already uses that name.',
    });
  }

  const formValid = validAggName;

  return (
    <EuiForm>
      <EuiFlexGroup>
        <EuiFlexItem style={{ width: 200 }}>
          <EuiFormRow
            error={!validAggName && [aggNameError]}
            isInvalid={!validAggName}
            label={i18n.translate('xpack.ml.dataframe.popoverForm.aggNameLabel', {
              defaultMessage: 'Aggregation name',
            })}
          >
            <EuiFieldText
              defaultValue={aggName}
              isInvalid={!validAggName}
              onChange={e => setAggName(e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        {availableAggs.length > 1 && (
          <EuiFlexItem style={{ width: 150 }}>
            <EuiFormRow
              label={i18n.translate('xpack.ml.dataframe.popoverForm.aggLabel', {
                defaultMessage: 'Aggregation',
              })}
            >
              <EuiSelect
                options={availableAggs}
                value={agg}
                onChange={e => setAgg(e.target.value as PIVOT_SUPPORTED_AGGS)}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
        {availableFields.length > 1 && (
          <EuiFlexItem style={{ width: 150 }}>
            <EuiFormRow
              label={i18n.translate('xpack.ml.dataframe.popoverForm.fieldLabel', {
                defaultMessage: 'Field',
              })}
            >
              <EuiSelect
                options={availableFields}
                value={field}
                onChange={e => setField(e.target.value)}
              />
            </EuiFormRow>
          </EuiFlexItem>
        )}
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButton
              isDisabled={!formValid}
              onClick={() => onChange({ ...defaultData, aggName, agg, field })}
            >
              {i18n.translate('xpack.ml.dataframe.popoverForm.submitButtonLabel', {
                defaultMessage: 'Apply',
              })}
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
