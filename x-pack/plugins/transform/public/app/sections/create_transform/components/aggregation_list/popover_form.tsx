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
  isPivotAggsConfigPercentiles,
  isPivotAggsConfigWithUiSupport,
  getEsAggFromAggConfig,
  PERCENTILES_AGG_DEFAULT_PERCENTS,
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

function getDefaultPercents(defaultData: PivotAggsConfig): number[] | undefined {
  if (isPivotAggsConfigPercentiles(defaultData)) {
    return defaultData.percents;
  }
}

function parsePercentsInput(inputValue: string | undefined) {
  if (inputValue !== undefined) {
    const strVals: string[] = inputValue.split(',');
    const percents: number[] = [];
    for (const str of strVals) {
      if (str.trim().length > 0 && isNaN(str as any) === false) {
        const val = Number(str);
        if (val >= 0 && val <= 100) {
          percents.push(val);
        } else {
          return [];
        }
      }
    }

    return percents;
  }

  return [];
}

export const PopoverForm: React.FC<Props> = ({ defaultData, otherAggNames, onChange, options }) => {
  const isUnsupportedAgg = !isPivotAggsConfigWithUiSupport(defaultData);

  const [aggName, setAggName] = useState(defaultData.aggName);
  const [agg, setAgg] = useState(defaultData.agg);
  const [field, setField] = useState(
    isPivotAggsConfigWithUiSupport(defaultData) ? defaultData.field : ''
  );
  const [percents, setPercents] = useState(getDefaultPercents(defaultData));

  const availableFields: SelectOption[] = [];
  const availableAggs: SelectOption[] = [];

  function updateAgg(aggVal: PIVOT_SUPPORTED_AGGS) {
    setAgg(aggVal);
    if (aggVal === PIVOT_SUPPORTED_AGGS.PERCENTILES && percents === undefined) {
      setPercents(PERCENTILES_AGG_DEFAULT_PERCENTS);
    }
  }

  function updatePercents(inputValue: string) {
    setPercents(parsePercentsInput(inputValue));
  }

  function getUpdatedItem(): PivotAggsConfig {
    let updatedItem: PivotAggsConfig;

    if (agg !== PIVOT_SUPPORTED_AGGS.PERCENTILES) {
      updatedItem = {
        agg,
        aggName,
        field,
        dropDownName: defaultData.dropDownName,
      };
    } else {
      updatedItem = {
        agg,
        aggName,
        field,
        dropDownName: defaultData.dropDownName,
        percents,
      };
    }

    return updatedItem;
  }

  if (!isUnsupportedAgg) {
    const optionsArr = dictionaryToArray(options);
    optionsArr
      .filter((o) => o.agg === defaultData.agg)
      .forEach((o) => {
        availableFields.push({ text: o.field });
      });
    optionsArr
      .filter((o) => isPivotAggsConfigWithUiSupport(defaultData) && o.field === defaultData.field)
      .forEach((o) => {
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

  let percentsText;
  if (percents !== undefined) {
    percentsText = percents.toString();
  }

  const validPercents =
    agg === PIVOT_SUPPORTED_AGGS.PERCENTILES && parsePercentsInput(percentsText).length > 0;

  let formValid = validAggName;
  if (formValid && agg === PIVOT_SUPPORTED_AGGS.PERCENTILES) {
    formValid = validPercents;
  }

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
          onChange={(e) => setAggName(e.target.value)}
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
            onChange={(e) => updateAgg(e.target.value as PIVOT_SUPPORTED_AGGS)}
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
            onChange={(e) => setField(e.target.value)}
          />
        </EuiFormRow>
      )}
      {agg === PIVOT_SUPPORTED_AGGS.PERCENTILES && (
        <EuiFormRow
          label={i18n.translate('xpack.transform.agg.popoverForm.percentsLabel', {
            defaultMessage: 'Percents',
          })}
          error={
            !validPercents && [
              i18n.translate('xpack.transform.groupBy.popoverForm.intervalPercents', {
                defaultMessage: 'Enter a comma-separated list of percentiles',
              }),
            ]
          }
          isInvalid={!validPercents}
        >
          <EuiFieldText
            defaultValue={percentsText}
            onChange={(e) => updatePercents(e.target.value)}
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
        <EuiButton isDisabled={!formValid} onClick={() => onChange(getUpdatedItem())}>
          {i18n.translate('xpack.transform.agg.popoverForm.submitButtonLabel', {
            defaultMessage: 'Apply',
          })}
        </EuiButton>
      </EuiFormRow>
    </EuiForm>
  );
};
