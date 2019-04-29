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
} from '@elastic/eui';

import {
  dateHistogramIntervalFormatRegex,
  histogramIntervalFormatRegex,
  PIVOT_SUPPORTED_GROUP_BY_AGGS,
} from '../../common';

export type supportedIntervalTypes =
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM;

export function isIntervalValid(interval: string, intervalType: supportedIntervalTypes) {
  if (interval !== '') {
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

interface Props {
  defaultInterval: string;
  intervalType: supportedIntervalTypes;
  onChange(interval: string): void;
}

export const PopoverForm: React.SFC<Props> = ({ defaultInterval, intervalType, onChange }) => {
  const [interval, setInterval] = useState(defaultInterval);

  const valid = isIntervalValid(interval, intervalType);

  return (
    <EuiForm>
      <EuiFlexGroup>
        <EuiFlexItem grow={false} style={{ width: 100 }}>
          <EuiFormRow
            error={
              !valid && [
                i18n.translate('xpack.ml.dataframe.popoverForm.intervalError', {
                  defaultMessage: 'Invalid interval.',
                }),
              ]
            }
            isInvalid={!valid}
            label={i18n.translate('xpack.ml.dataframe.popoverForm.intervalLabel', {
              defaultMessage: 'Interval',
            })}
          >
            <EuiFieldText
              defaultValue={interval}
              isInvalid={!valid}
              onChange={e => setInterval(e.target.value)}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow hasEmptyLabelSpace>
            <EuiButton isDisabled={!valid} onClick={() => onChange(interval)}>
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
