/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useState } from 'react';

import { i18n } from '@kbn/i18n';

import {
  EuiButton,
  EuiCodeEditor,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
} from '@elastic/eui';

import { dictionaryToArray } from '../../../../../../common/types/common';

import {
  AggName,
  dateHistogramIntervalFormatRegex,
  getEsAggFromGroupByConfig,
  isGroupByDateHistogram,
  isGroupByHistogram,
  isPivotGroupByConfigWithUiSupport,
  histogramIntervalFormatRegex,
  isAggName,
  PivotGroupByConfig,
  PivotGroupByConfigWithUiSupportDict,
  PivotSupportedGroupByAggs,
  PivotSupportedGroupByAggsWithInterval,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../../../common';

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

function getDefaultInterval(defaultData: PivotGroupByConfig): string | undefined {
  if (isGroupByDateHistogram(defaultData)) {
    return defaultData.calendar_interval;
  } else if (isGroupByHistogram(defaultData)) {
    return defaultData.interval;
  }

  return undefined;
}

interface Props {
  defaultData: PivotGroupByConfig;
  otherAggNames: AggName[];
  options: PivotGroupByConfigWithUiSupportDict;
  onChange(item: PivotGroupByConfig): void;
}

export const PopoverForm: React.FC<Props> = ({ defaultData, otherAggNames, onChange, options }) => {
  const isUnsupportedAgg = !isPivotGroupByConfigWithUiSupport(defaultData);

  const [agg, setAgg] = useState(defaultData.agg);
  const [aggName, setAggName] = useState(defaultData.aggName);
  const [field, setField] = useState(
    isPivotGroupByConfigWithUiSupport(defaultData) ? defaultData.field : ''
  );
  const [interval, setInterval] = useState(getDefaultInterval(defaultData));

  function getUpdatedItem(): PivotGroupByConfig {
    const updatedItem = { ...defaultData, agg, aggName, field };

    if (isGroupByHistogram(updatedItem) && interval !== undefined) {
      updatedItem.interval = interval;
    } else if (isGroupByDateHistogram(updatedItem) && interval !== undefined) {
      updatedItem.calendar_interval = interval;
    }

    // Casting to PivotGroupByConfig because TS would otherwise complain about the
    // PIVOT_SUPPORTED_GROUP_BY_AGGS type for `agg`.
    return updatedItem as PivotGroupByConfig;
  }

  const availableFields: SelectOption[] = [];
  const availableAggs: SelectOption[] = [];

  if (!isUnsupportedAgg) {
    const optionsArr = dictionaryToArray(options);
    optionsArr
      .filter((o) => o.agg === defaultData.agg)
      .forEach((o) => {
        availableFields.push({ text: o.field });
      });
    optionsArr
      .filter(
        (o) => isPivotGroupByConfigWithUiSupport(defaultData) && o.field === defaultData.field
      )
      .forEach((o) => {
        availableAggs.push({ text: o.agg });
      });
  }

  let aggNameError = '';

  let validAggName = isAggName(aggName);
  if (!validAggName) {
    aggNameError = i18n.translate('xpack.transform.groupBy.popoverForm.aggNameInvalidCharError', {
      defaultMessage:
        'Invalid name. The characters "[", "]", and ">" are not allowed and the name must not start or end with a space character.',
    });
  }

  if (validAggName) {
    validAggName = !otherAggNames.includes(aggName);
    aggNameError = i18n.translate('xpack.transform.groupBy.popoverForm.aggNameAlreadyUsedError', {
      defaultMessage: 'Another group by configuration already uses that name.',
    });
  }

  const validInterval =
    (isGroupByDateHistogram(defaultData) || isGroupByHistogram(defaultData)) &&
    isIntervalValid(interval, defaultData.agg);

  let formValid = validAggName;
  if (formValid && (isGroupByDateHistogram(defaultData) || isGroupByHistogram(defaultData))) {
    formValid = isIntervalValid(interval, defaultData.agg);
  }

  return (
    <EuiForm style={{ width: '300px' }}>
      <EuiFormRow
        error={!validAggName && [aggNameError]}
        isInvalid={!validAggName}
        helpText={
          isUnsupportedAgg
            ? i18n.translate('xpack.transform.groupBy.popoverForm.unsupportedGroupByHelpText', {
                defaultMessage:
                  'Only the group_by name can be edited in this form. Please use the advanced editor to edit the other parts of the group_by configuration.',
              })
            : ''
        }
        label={i18n.translate('xpack.transform.groupBy.popoverForm.nameLabel', {
          defaultMessage: 'Group by name',
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
          label={i18n.translate('xpack.transform.groupby.popoverForm.aggLabel', {
            defaultMessage: 'Aggregation',
          })}
        >
          <EuiSelect
            options={availableAggs}
            value={agg}
            onChange={(e) => setAgg(e.target.value as PivotSupportedGroupByAggs)}
          />
        </EuiFormRow>
      )}
      {availableFields.length > 0 && (
        <EuiFormRow
          label={i18n.translate('xpack.transform.groupBy.popoverForm.fieldLabel', {
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
      {(isGroupByDateHistogram(defaultData) || isGroupByHistogram(defaultData)) && (
        <EuiFormRow
          error={
            !validInterval && [
              i18n.translate('xpack.transform.groupBy.popoverForm.intervalError', {
                defaultMessage: 'Invalid interval.',
              }),
            ]
          }
          isInvalid={!validInterval}
          label={i18n.translate('xpack.transform.groupBy.popoverForm.intervalLabel', {
            defaultMessage: 'Interval',
          })}
        >
          <Fragment>
            {isGroupByHistogram(defaultData) && (
              <EuiFieldText
                defaultValue={interval}
                isInvalid={!validInterval}
                onChange={(e) => setInterval(e.target.value)}
              />
            )}
            {isGroupByDateHistogram(defaultData) && (
              <EuiSelect
                options={[
                  { value: '1m', text: '1m' },
                  { value: '1h', text: '1h' },
                  { value: '1d', text: '1d' },
                  { value: '1w', text: '1w' },
                  { value: '1M', text: '1M' },
                  { value: '1q', text: '1q' },
                  { value: '1y', text: '1y' },
                ]}
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
              />
            )}
          </Fragment>
        </EuiFormRow>
      )}
      {isUnsupportedAgg && (
        <Fragment>
          <EuiSpacer size="m" />
          <EuiCodeEditor
            mode="json"
            theme="textmate"
            width="100%"
            height="200px"
            value={JSON.stringify(getEsAggFromGroupByConfig(defaultData), null, 2)}
            setOptions={{ fontSize: '12px', showLineNumbers: false }}
            isReadOnly
            aria-label="Read only code editor"
          />
        </Fragment>
      )}
      <EuiFormRow hasEmptyLabelSpace>
        <EuiButton isDisabled={!formValid} onClick={() => onChange(getUpdatedItem())}>
          {i18n.translate('xpack.transform.groupBy.popoverForm.submitButtonLabel', {
            defaultMessage: 'Apply',
          })}
        </EuiButton>
      </EuiFormRow>
    </EuiForm>
  );
};
