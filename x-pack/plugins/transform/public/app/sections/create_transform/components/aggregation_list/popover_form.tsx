/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiCodeEditor,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
} from '@elastic/eui';

import { dictionaryToArray } from '../../../../../../common/types/common';

import {
  AggName,
  isAggName,
  isPivotAggsConfigWithUiSupport,
  getEsAggFromAggConfig,
  PivotAggsConfig,
  PivotAggsConfigWithUiSupportDict,
  PIVOT_SUPPORTED_AGGS,
} from '../../../../common';

interface SelectOption {
  text: string;
}

interface Props {
  defaultData: PivotAggsConfig;
  otherAggNames: AggName[];
  options: PivotAggsConfigWithUiSupportDict;
  onChange(d: PivotAggsConfig): void;
}

export const PopoverForm: React.FC<Props> = ({ defaultData, otherAggNames, onChange, options }) => {
  const isUnsupportedAgg = !isPivotAggsConfigWithUiSupport(defaultData);

  const [aggName, setAggName] = useState(defaultData.aggName);
  const [agg, setAgg] = useState(defaultData.agg);
  const [field, setField] = useState(
    isPivotAggsConfigWithUiSupport(defaultData) ? defaultData.field : ''
  );

  const availableFields: SelectOption[] = [];
  const availableAggs: SelectOption[] = [];

  if (!isUnsupportedAgg) {
    const optionsArr = dictionaryToArray(options);
    optionsArr
      .filter(o => o.agg === defaultData.agg)
      .forEach(o => {
        availableFields.push({ text: o.field });
      });
    optionsArr
      .filter(o => isPivotAggsConfigWithUiSupport(defaultData) && o.field === defaultData.field)
      .forEach(o => {
        availableAggs.push({ text: o.agg });
      });
  }

  let aggNameError = '';

  let validAggName = isAggName(aggName);
  if (!validAggName) {
    aggNameError = i18n.translate('xpack.transform.agg.popoverForm.aggNameInvalidCharError', {
      defaultMessage:
        'Invalid name. The characters "[", "]", and ">" are not allowed and the name must not start or end with a space character.',
    });
  }

  if (validAggName) {
    validAggName = !otherAggNames.includes(aggName);
    aggNameError = i18n.translate('xpack.transform.agg.popoverForm.aggNameAlreadyUsedError', {
      defaultMessage: 'Another aggregation already uses that name.',
    });
  }

  const formValid = validAggName;

  return (
    <EuiForm style={{ width: '300px' }}>
      <EuiFormRow
        error={!validAggName && [aggNameError]}
        isInvalid={!validAggName}
        helpText={
          isUnsupportedAgg
            ? i18n.translate('xpack.transform.agg.popoverForm.unsupportedAggregationHelpText', {
                defaultMessage:
                  'Only the aggregation name can be edited in this form. Please use the advanced editor to edit the other parts of the aggregation.',
              })
            : ''
        }
        label={i18n.translate('xpack.transform.agg.popoverForm.nameLabel', {
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
          label={i18n.translate('xpack.transform.agg.popoverForm.aggLabel', {
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
          label={i18n.translate('xpack.transform.agg.popoverForm.fieldLabel', {
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
      {isUnsupportedAgg && (
        <EuiCodeEditor
          mode="json"
          theme="textmate"
          width="100%"
          height="200px"
          value={JSON.stringify(getEsAggFromAggConfig(defaultData), null, 2)}
          setOptions={{ fontSize: '12px', showLineNumbers: false }}
          isReadOnly
          aria-label="Read only code editor"
        />
      )}
      <EuiFormRow hasEmptyLabelSpace>
        <EuiButton
          isDisabled={!formValid}
          onClick={() => onChange({ ...defaultData, aggName, agg, field })}
        >
          {i18n.translate('xpack.transform.agg.popoverForm.submitButtonLabel', {
            defaultMessage: 'Apply',
          })}
        </EuiButton>
      </EuiFormRow>
    </EuiForm>
  );
};
