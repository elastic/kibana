/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGrid, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { getOr } from 'lodash/fp';
import moment, { Moment } from 'moment';
import React from 'react';
import { pure } from 'recompose';

import { DateType, RecentlyUsedI } from '..';

export enum DatePickerOptions {
  today = 'today',
  yesterday = 'yesterday',
  thisWeek = 'this-week',
  weekToDate = 'week-to-date',
  thisMonth = 'this-month',
  monthToDate = 'month-to-date',
  thisYear = 'this-year',
  yearToDate = 'year-to-date',
}

const commonDates: Array<{ id: DatePickerOptions; label: string }> = [
  {
    id: DatePickerOptions.today,
    label: 'Today',
  },
  {
    id: DatePickerOptions.yesterday,
    label: 'Yesterday',
  },
  {
    id: DatePickerOptions.thisWeek,
    label: 'This week',
  },
  {
    id: DatePickerOptions.weekToDate,
    label: 'Week to date',
  },
  {
    id: DatePickerOptions.thisMonth,
    label: 'This month',
  },
  {
    id: DatePickerOptions.monthToDate,
    label: 'Month to date',
  },
  {
    id: DatePickerOptions.thisYear,
    label: 'This year',
  },
  {
    id: DatePickerOptions.yearToDate,
    label: 'Year to date',
  },
];

interface Props {
  setRangeDatePicker: (from: Moment, to: Moment, type: DateType, msg: RecentlyUsedI) => void;
}

export const CommonlyUsed = pure<Props>(({ setRangeDatePicker }) => {
  const links = commonDates.map(date => {
    return (
      <EuiFlexItem key={date.id}>
        <EuiLink onClick={() => updateRangeDatePickerByCommonUsed(date.id, setRangeDatePicker)}>
          {date.label}
        </EuiLink>
      </EuiFlexItem>
    );
  });

  return (
    <>
      <EuiTitle size="xxxs">
        <span>Commonly used</span>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" className="euiGlobalDatePicker__popoverSection">
        <EuiFlexGrid gutterSize="s" columns={2}>
          {links}
        </EuiFlexGrid>
      </EuiText>
    </>
  );
});

export const updateRangeDatePickerByCommonUsed = (
  option: DatePickerOptions,
  setRangeDatePicker: (from: Moment, to: Moment, kind: DateType, msg: RecentlyUsedI) => void
) => {
  let from = null;
  let to = null;
  let kind: DateType = 'absolute';
  if (option === DatePickerOptions.today) {
    from = moment().startOf('day');
    to = moment()
      .startOf('day')
      .add(24, 'hour');
    kind = 'absolute';
  } else if (option === DatePickerOptions.yesterday) {
    from = moment()
      .subtract(1, 'day')
      .startOf('day');
    to = moment()
      .subtract(1, 'day')
      .startOf('day')
      .add(24, 'hour');
    kind = 'absolute';
  } else if (option === DatePickerOptions.thisWeek) {
    from = moment().startOf('week');
    to = moment()
      .startOf('week')
      .add(1, 'week');
    kind = 'absolute';
  } else if (option === DatePickerOptions.weekToDate) {
    from = moment().startOf('week');
    to = moment();
    kind = 'relative';
  } else if (option === DatePickerOptions.thisMonth) {
    from = moment().startOf('month');
    to = moment()
      .startOf('month')
      .add(1, 'month');
    kind = 'absolute';
  } else if (option === DatePickerOptions.monthToDate) {
    from = moment().startOf('month');
    to = moment();
    kind = 'relative';
  } else if (option === DatePickerOptions.thisYear) {
    from = moment().startOf('year');
    to = moment()
      .startOf('year')
      .add(1, 'year');
    kind = 'absolute';
  } else if (option === DatePickerOptions.yearToDate) {
    from = moment().startOf('year');
    to = moment();
    kind = 'relative';
  }
  if (from && to) {
    const text = getOr('', 'label', commonDates.filter(i => i.id === option)[0]);
    setRangeDatePicker(from, to, kind, {
      kind: option,
      text,
    });
  }
};
