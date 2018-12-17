/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLink, EuiSpacer, EuiText, EuiTitle } from '@elastic/eui';
import moment, { Moment } from 'moment';
import React from 'react';
import { pure } from 'recompose';
import { DateType, RecentlyUsedI } from '../index';
import { DatePickerOptions, updateRangeDatePickerByCommonUsed } from './commonly_used';
import { updateRangeDatePickerByQuickSelect } from './quick_select';

interface Props {
  recentlyUsed: RecentlyUsedI[];
  setRangeDatePicker: (from: Moment, to: Moment, kind: DateType) => void;
}

export const MyRecentlyUsed = pure<Props>(({ setRangeDatePicker, recentlyUsed }) => {
  const links = recentlyUsed.map((date: RecentlyUsedI) => {
    let dateRange;
    let dateLink = (
      <EuiLink onClick={updateRangeDatePicker.bind(null, date.kind, setRangeDatePicker, date.text)}>
        {date.text}
      </EuiLink>
    );
    if (typeof date.text !== 'string') {
      dateRange = `${moment(date.text[0]).format('L LTS')} – ${moment(date.text[1]).format(
        'L LTS'
      )}`;
      dateLink = (
        <EuiLink onClick={setRangeDatePicker.bind(null, date.text[0], date.text[1], 'absolute')}>
          {dateRange}
        </EuiLink>
      );
    }

    return (
      <EuiFlexItem grow={false} key={`${dateRange || date.kind}`}>
        {dateLink}
      </EuiFlexItem>
    );
  });

  return (
    <>
      <EuiTitle size="xxxs">
        <span>Recently used date ranges</span>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiText size="s" className="euiGlobalDatePicker__popoverSection">
        <EuiFlexGroup gutterSize="s" style={{ flexDirection: 'column' }}>
          {links}
        </EuiFlexGroup>
      </EuiText>
    </>
  );
});

const updateRangeDatePicker = (
  option: string,
  setRangeDatePicker: (from: Moment, to: Moment, kind: DateType, msg?: RecentlyUsedI) => void,
  text?: string
) => {
  if (option === 'quick-select') {
    const options = text!.split(' ');
    updateRangeDatePickerByQuickSelect(parseInt(options[1], 10), options[2], setRangeDatePicker);
  } else {
    updateRangeDatePickerByCommonUsed(option as DatePickerOptions, setRangeDatePicker);
  }
};
