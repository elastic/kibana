/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';

import { EuiButton, EuiFieldText, EuiForm, EuiFormRow, EuiSelect } from '@elastic/eui';

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
    aggNameError = i18n.translate('xpack.ml.dataframe.agg.popoverForm.aggNameInvalidCharError', {
      defaultMessage:
        'Invalid name. The characters "[", "]", and ">" are not allowed and the name must not start or end with a space character.',
    });
  }

  if (validAggName) {
    validAggName = !otherAggNames.includes(aggName);
    aggNameError = i18n.translate('xpack.ml.dataframe.agg.popoverForm.aggNameAlreadyUsedError', {
      defaultMessage: 'Another aggregation already uses that name.',
    });
  }

  const formValid = validAggName;

  return (
    <EuiForm style={{ width: '300px' }}>
      <EuiFormRow
        error={!validAggName && [aggNameError]}
        isInvalid={!validAggName}
        label={i18n.translate('xpack.ml.dataframe.agg.popoverForm.nameLabel', {
          defaultMessage: 'Aggregation name',
        })}
      >
        <EuiFieldText
          defaultValue={aggName}
          isInvalid={!validAggName}
          onChange={e => setAggName(e.target.value)}
        />
      </EuiFormRow>
      {availableAggs.length > 0 && (
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.agg.popoverForm.aggLabel', {
            defaultMessage: 'Aggregation',
          })}
        >
          <EuiSelect
            options={availableAggs}
            value={agg}
            onChange={e => setAgg(e.target.value as PIVOT_SUPPORTED_AGGS)}
          />
        </EuiFormRow>
      )}
      {availableFields.length > 0 && (
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.agg.popoverForm.fieldLabel', {
            defaultMessage: 'Field',
          })}
        >
          <EuiSelect
            options={availableFields}
            value={field}
            onChange={e => setField(e.target.value)}
          />
        </EuiFormRow>
      )}
      <EuiFormRow hasEmptyLabelSpace>
        <EuiButton
          isDisabled={!formValid}
          onClick={() => onChange({ ...defaultData, aggName, agg, field })}
        >
          {i18n.translate('xpack.ml.dataframe.agg.popoverForm.submitButtonLabel', {
            defaultMessage: 'Apply',
          })}
        </EuiButton>
      </EuiFormRow>
    </EuiForm>
  );
};
