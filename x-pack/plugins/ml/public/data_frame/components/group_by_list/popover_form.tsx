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
  dateHistogramIntervalFormatRegex,
  groupByConfigHasInterval,
  histogramIntervalFormatRegex,
  isAggName,
  PivotGroupByConfig,
  PivotGroupByConfigDict,
  PivotSupportedGroupByAggs,
  PivotSupportedGroupByAggsWithInterval,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../common';

export function isIntervalValid(
  interval: optionalInterval,
  intervalType: PivotSupportedGroupByAggsWithInterval
) {
  if (interval !== '' && interval !== undefined) {
    if (intervalType === PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM) {
      if (!histogramIntervalFormatRegex.test(interval)) {
        return false;
      }
      if (parseFloat(interval) === 0 && parseInt(interval, 10) === 0) {
        return false;
      }
      return true;
    } else if (intervalType === PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM) {
      if (!dateHistogramIntervalFormatRegex.test(interval)) {
        return false;
      }

      const timeUnitMatch = interval.match(dateHistogramIntervalFormatRegex);
      if (timeUnitMatch !== null && Array.isArray(timeUnitMatch) && timeUnitMatch.length === 2) {
        const timeUnit = timeUnitMatch[1];
        const intervalNum = parseInt(interval.replace(timeUnit, ''), 10);
        if ((timeUnit === 'w' || timeUnit === 'M' || timeUnit === 'y') && intervalNum > 1) {
          return false;
        }
      }

      return true;
    }
  }
  return false;
}

interface SelectOption {
  text: string;
}

type optionalInterval = string | undefined;

interface Props {
  defaultData: PivotGroupByConfig;
  otherAggNames: AggName[];
  options: PivotGroupByConfigDict;
  onChange(item: PivotGroupByConfig): void;
}

export const PopoverForm: React.SFC<Props> = ({
  defaultData,
  otherAggNames,
  onChange,
  options,
}) => {
  const [agg, setAgg] = useState(defaultData.agg);
  const [aggName, setAggName] = useState(defaultData.aggName);
  const [field, setField] = useState(defaultData.field);
  const [interval, setInterval] = useState(
    groupByConfigHasInterval(defaultData) ? defaultData.interval : undefined
  );

  function getUpdatedItem(): PivotGroupByConfig {
    const updatedItem = { ...defaultData, agg, aggName, field };
    if (groupByConfigHasInterval(updatedItem) && interval !== undefined) {
      updatedItem.interval = interval;
    }
    // Casting to PivotGroupByConfig because TS would otherwise complain about the
    // PIVOT_SUPPORTED_GROUP_BY_AGGS type for `agg`.
    return updatedItem as PivotGroupByConfig;
  }

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
    aggNameError = i18n.translate(
      'xpack.ml.dataframe.groupBy.popoverForm.aggNameInvalidCharError',
      {
        defaultMessage:
          'Invalid name. The characters "[", "]", and ">" are not allowed and the name must not start or end with a space character.',
      }
    );
  }

  if (validAggName) {
    validAggName = !otherAggNames.includes(aggName);
    aggNameError = i18n.translate(
      'xpack.ml.dataframe.groupBy.popoverForm.aggNameAlreadyUsedError',
      {
        defaultMessage: 'Another group by configuration already uses that name.',
      }
    );
  }

  const validInterval =
    groupByConfigHasInterval(defaultData) && isIntervalValid(interval, defaultData.agg);

  let formValid = validAggName;
  if (formValid && groupByConfigHasInterval(defaultData)) {
    formValid = isIntervalValid(interval, defaultData.agg);
  }

  return (
    <EuiForm style={{ width: '300px' }}>
      <EuiFormRow
        error={!validAggName && [aggNameError]}
        isInvalid={!validAggName}
        label={i18n.translate('xpack.ml.dataframe.groupBy.popoverForm.nameLabel', {
          defaultMessage: 'Group by name',
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
          label={i18n.translate('xpack.ml.dataframe.groupby.popoverForm.aggLabel', {
            defaultMessage: 'Aggregation',
          })}
        >
          <EuiSelect
            options={availableAggs}
            value={agg}
            onChange={e => setAgg(e.target.value as PivotSupportedGroupByAggs)}
          />
        </EuiFormRow>
      )}
      {availableFields.length > 0 && (
        <EuiFormRow
          label={i18n.translate('xpack.ml.dataframe.groupBy.popoverForm.fieldLabel', {
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
      {groupByConfigHasInterval(defaultData) && (
        <EuiFormRow
          error={
            !validInterval && [
              i18n.translate('xpack.ml.dataframe.groupBy.popoverForm.intervalError', {
                defaultMessage: 'Invalid interval.',
              }),
            ]
          }
          isInvalid={!validInterval}
          label={i18n.translate('xpack.ml.dataframe.groupBy.popoverForm.intervalLabel', {
            defaultMessage: 'Interval',
          })}
        >
          <EuiFieldText
            defaultValue={interval}
            isInvalid={!validInterval}
            onChange={e => setInterval(e.target.value)}
          />
        </EuiFormRow>
      )}
      <EuiFormRow hasEmptyLabelSpace>
        <EuiButton isDisabled={!formValid} onClick={() => onChange(getUpdatedItem())}>
          {i18n.translate('xpack.ml.dataframe.groupBy.popoverForm.submitButtonLabel', {
            defaultMessage: 'Apply',
          })}
        </EuiButton>
      </EuiFormRow>
    </EuiForm>
  );
};
