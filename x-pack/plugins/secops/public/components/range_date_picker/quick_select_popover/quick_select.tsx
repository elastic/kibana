/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiFieldNumber,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiSelect,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import { find, get } from 'lodash';
import moment, { Moment } from 'moment';
import React from 'react';
import { pure } from 'recompose';
import { DateType, RecentlyUsedI } from '..';

interface Options {
  value: string;
  text: string;
}

export const singleLastOptions: Options[] = [
  {
    value: 'seconds',
    text: 'second',
  },
  {
    value: 'minutes',
    text: 'minute',
  },
  {
    value: 'hours',
    text: 'hour',
  },
  {
    value: 'days',
    text: 'day',
  },
  {
    value: 'weeks',
    text: 'week',
  },
  {
    value: 'months',
    text: 'month',
  },
  {
    value: 'years',
    text: 'year',
  },
];

export const pluralLastOptions: Options[] = [
  {
    value: 'seconds',
    text: 'seconds',
  },
  {
    value: 'minutes',
    text: 'minutes',
  },
  {
    value: 'hours',
    text: 'hours',
  },
  {
    value: 'days',
    text: 'days',
  },
  {
    value: 'weeks',
    text: 'weeks',
  },
  {
    value: 'months',
    text: 'months',
  },
  {
    value: 'years',
    text: 'years',
  },
];

interface Props {
  quickSelectTime: number;
  quickSelectUnit: string;
  onChange: (
    stateType: string,
    args: React.FormEvent<HTMLInputElement> | React.ChangeEvent<HTMLSelectElement>
  ) => void;
  setRangeDatePicker: (from: Moment, to: Moment, type: DateType, msg?: RecentlyUsedI) => void;
}

export const QuickSelect = pure<Props>(
  ({ setRangeDatePicker, quickSelectTime, quickSelectUnit, onChange }) => (
    <>
      <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
        <EuiFlexItem>
          <EuiTitle size="xxxs">
            <span>Quick select</span>
          </EuiTitle>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem>
          <EuiTitle size="s">
            <span>Last</span>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiFieldNumber
              aria-label="Count of"
              defaultValue="1"
              value={quickSelectTime}
              step={0}
              onChange={arg => {
                onChange('quickSelectTime', arg);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFormRow>
            <EuiSelect
              value={quickSelectUnit}
              options={quickSelectTime === 1 ? singleLastOptions : pluralLastOptions}
              onChange={arg => {
                onChange('quickSelectUnit', arg);
              }}
            />
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiFormRow>
            <EuiButton
              onClick={updateRangeDatePickerByQuickSelect.bind(
                null,
                quickSelectTime,
                quickSelectUnit,
                setRangeDatePicker
              )}
              style={{ minWidth: 0 }}
            >
              Apply
            </EuiButton>
          </EuiFormRow>
        </EuiFlexItem>
      </EuiFlexGroup>
    </>
  )
);

export const updateRangeDatePickerByQuickSelect = (
  quickSelectTime: number,
  quickSelectUnit: string,
  setRangeDatePicker: (from: Moment, to: Moment, type: DateType, msg?: RecentlyUsedI) => void
) => {
  const quickSelectUnitStr =
    quickSelectTime === 1
      ? get(find(singleLastOptions, { value: quickSelectUnit }), 'text')
      : get(find(pluralLastOptions, { value: quickSelectUnit }), 'text');
  const from = moment().subtract(
    quickSelectTime,
    quickSelectUnit as moment.unitOfTime.DurationConstructor
  );
  const to = moment();
  setRangeDatePicker(from, to, 'relative', {
    type: 'quick-select',
    text: `Last ${quickSelectTime} ${quickSelectUnitStr}`,
  });
};
