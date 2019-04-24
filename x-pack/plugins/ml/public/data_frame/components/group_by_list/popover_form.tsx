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

type supportedIntervalTypes =
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM
  | PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM;

export function isIntervalValid(interval: string, intervalType: supportedIntervalTypes) {
  let valid = true;

  valid = interval !== '';

  if (valid && intervalType === PIVOT_SUPPORTED_GROUP_BY_AGGS.HISTOGRAM) {
    valid = histogramIntervalFormatRegex.test(interval);
  } else if (valid && intervalType === PIVOT_SUPPORTED_GROUP_BY_AGGS.DATE_HISTOGRAM) {
    valid = dateHistogramIntervalFormatRegex.test(interval);
  }

  return valid;
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
              Save
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiForm>
  );
};
