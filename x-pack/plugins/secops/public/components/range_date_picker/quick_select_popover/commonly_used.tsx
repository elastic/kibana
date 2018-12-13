/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGrid, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import { find, get } from 'lodash';
import moment, { Moment } from 'moment';
import React from 'react';
import { pure } from 'recompose';
import { DateType, RecentlyUsedI } from '..';

export enum DatePickerDateOptions {
  today = 'today',
  yesterday = 'yesterday',
  thisWeek = 'this_week',
  weekToDate = 'week_to_date',
  thisMonth = 'this_month',
  monthToDate = 'month_to_date',
  thisYear = 'this_year',
  yearToDate = 'year_to_date',
}

const commonDates: Array<{ id: string; label: string }> = [
  {
    id: DatePickerDateOptions.today,
    label: 'Today',
  },
  {
    id: DatePickerDateOptions.yesterday,
    label: 'Yesterday',
  },
  {
    id: DatePickerDateOptions.thisWeek,
    label: 'This week',
  },
  {
    id: DatePickerDateOptions.weekToDate,
    label: 'Week to date',
  },
  {
    id: DatePickerDateOptions.thisMonth,
    label: 'This month',
  },
  {
    id: DatePickerDateOptions.monthToDate,
    label: 'Month to date',
  },
  {
    id: DatePickerDateOptions.thisYear,
    label: 'This year',
  },
  {
    id: DatePickerDateOptions.yearToDate,
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
        <EuiLink
          onClick={updateRangeDatePickerByCommonUsed.bind(
            null,
            date.id as DatePickerDateOptions,
            setRangeDatePicker
          )}
        >
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
        {/* <EuiFlexGrid gutterSize="s" columns={2} responsive={false}> */}
        <EuiFlexGrid gutterSize="s" columns={2}>
          {links}
        </EuiFlexGrid>
      </EuiText>
    </>
  );
});

export const updateRangeDatePickerByCommonUsed = (
  type: DatePickerDateOptions,
  setRangeDatePicker: (from: Moment, to: Moment, type: DateType, msg: RecentlyUsedI) => void
) => {
  let from = null;
  let to = null;
  if (type === DatePickerDateOptions.today) {
    from = moment().startOf('day');
    to = moment()
      .startOf('day')
      .add(24, 'hour');
  } else if (type === DatePickerDateOptions.yesterday) {
    from = moment()
      .subtract(1, 'day')
      .startOf('day');
    to = moment()
      .subtract(1, 'day')
      .startOf('day')
      .add(24, 'hour');
  } else if (type === DatePickerDateOptions.thisWeek) {
    from = moment().startOf('week');
    to = moment()
      .startOf('week')
      .add(1, 'week');
  } else if (type === DatePickerDateOptions.weekToDate) {
    from = moment().subtract(1, 'week');
    to = moment();
  } else if (type === DatePickerDateOptions.thisMonth) {
    from = moment().startOf('month');
    to = moment()
      .startOf('month')
      .add(1, 'month');
  } else if (type === DatePickerDateOptions.monthToDate) {
    from = moment().subtract(1, 'month');
    to = moment();
  } else if (type === DatePickerDateOptions.thisYear) {
    from = moment().startOf('year');
    to = moment()
      .startOf('year')
      .add(1, 'year');
  } else if (type === DatePickerDateOptions.yearToDate) {
    from = moment().subtract(1, 'year');
    to = moment();
  }
  if (from && to) {
    setRangeDatePicker(from, to, 'absolute', {
      type,
      text: get(find(commonDates, { id: type }), 'label'),
    });
  }
};
