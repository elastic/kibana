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
import { DatePickerDateOptions, updateRangeDatePickerByCommonUsed } from './commonly_used';
import { updateRangeDatePickerByQuickSelect } from './quick_select';

interface Props {
  recentlyUsed: RecentlyUsedI[];
  setRangeDatePicker: (from: Moment, to: Moment, type: DateType) => void;
}

export const MyRecentlyUsed = pure<Props>(({ setRangeDatePicker, recentlyUsed }) => {
  const links = recentlyUsed.map((date: RecentlyUsedI) => {
    let dateRange;
    let dateLink = (
      <EuiLink onClick={updateRangeDatePicker.bind(null, date.type, setRangeDatePicker, date.text)}>
        {dateRange || date.text}
      </EuiLink>
    );
    if (typeof date.text !== 'string') {
      dateRange = `${date.text[0]} – ${date.text[1]}`;
      dateLink = (
        <EuiLink
          onClick={setRangeDatePicker.bind(
            null,
            moment(date.text[0]),
            moment(date.text[1], 'absolute')
          )}
        >
          {dateRange || date.type}
        </EuiLink>
      );
    }

    return (
      <EuiFlexItem grow={false} key={`${dateRange || date.type}`}>
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
  type: string,
  setRangeDatePicker: (from: Moment, to: Moment, type: DateType, msg?: RecentlyUsedI) => void,
  text?: string
) => {
  if (type === 'quick-select') {
    const options = text!.split(' ');
    updateRangeDatePickerByQuickSelect(parseInt(options[1], 10), options[2], setRangeDatePicker);
  } else {
    updateRangeDatePickerByCommonUsed(type as DatePickerDateOptions, setRangeDatePicker);
  }
};
