/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import moment from 'moment';
import React, { Fragment } from 'react';

import { GlobalDatePopover } from './global_date_popover';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFieldNumber,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  // EuiForm,
  EuiFormControlLayout,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
  // EuiTabbedContent,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

const commonDates = [
  'Today',
  'Yesterday',
  'This week',
  'Week to date',
  'This month',
  'Month to date',
  'This year',
  'Year to date',
];

// const relativeSelectOptions = [
//   { text: 'Seconds ago', value: 'string:s' },
//   { text: 'Minutes ago', value: 'string:m' },
//   { text: 'Hours ago', value: 'string:h' },
//   { text: 'Days ago', value: 'string:d' },
//   { text: 'Weeks ago', value: 'string:w' },
//   { text: 'Months ago', value: 'string:M' },
//   { text: 'Years ago', value: 'string:y' },
//   { text: 'Seconds from now', value: 'string:s+' },
//   { text: 'Minutes from now', value: 'string:m+' },
//   { text: 'Hours from now', value: 'string:h+' },
//   { text: 'Days from now', value: 'string:d+' },
//   { text: 'Weeks from now', value: 'string:w+' },
//   { text: 'Months from now', value: 'string:M+' },
//   { text: 'Years from now', value: 'string:y+' },
// ];

interface GlobalDatePickerProps {
  startDate: moment.Moment;
  endDate: moment.Moment;
}

interface GlobalDatePickerState {
  startDate: moment.Moment;
  endDate: moment.Moment;
  isPopoverOpen: boolean;
  recentlyUsed: Array<string | string[]>;
}

export class GlobalDatePicker extends React.PureComponent<
  GlobalDatePickerProps,
  GlobalDatePickerState
> {
  public readonly state = {
    startDate: this.props.startDate,
    endDate: this.props.endDate, // moment().add(11, 'd'),
    isPopoverOpen: false,
    recentlyUsed: [
      ['11/25/2017 00:00 AM', '11/25/2017 11:59 PM'],
      ['3 hours ago', '4 minutes ago'],
      'Last 6 months',
      ['06/11/2017 06:11 AM', '06/11/2017 06:11 PM'],
    ],
  };

  public render() {
    const quickSelectButton = (
      <EuiButtonEmpty
        className="euiFormControlLayout__prepend"
        style={{ borderRight: 'none' }}
        onClick={this.onButtonClick}
        aria-label="Date quick select"
        size="xs"
        iconType="arrowDown"
        iconSide="right"
      >
        <EuiIcon type="calendar" />
      </EuiButtonEmpty>
    );

    const commonlyUsed = this.renderCommonlyUsed(commonDates);
    const recentlyUsed = this.renderRecentlyUsed(this.state.recentlyUsed);

    const quickSelectPopover = (
      <EuiPopover
        id="QuickSelectPopover"
        button={quickSelectButton}
        isOpen={this.state.isPopoverOpen}
        closePopover={this.closePopover.bind(this)}
        anchorPosition="downLeft"
        ownFocus
      >
        <div style={{ width: '400px' }}>
          {this.renderQuickSelect()}
          <EuiHorizontalRule />
          {commonlyUsed}
          <EuiHorizontalRule />
          {recentlyUsed}
        </div>
      </EuiPopover>
    );

    return (
      <EuiFormControlLayout prepend={quickSelectPopover}>
        <EuiDatePickerRange
          className="euiDatePickerRange--inGroup"
          iconType={false}
          startDateControl={
            <EuiDatePicker
              selected={this.state.startDate}
              onChange={this.handleChangeStart}
              startDate={this.state.startDate}
              endDate={this.state.endDate}
              isInvalid={this.state.startDate > this.state.endDate}
              aria-label="Start date"
              calendarContainer={GlobalDatePopover}
              showTimeSelect
            />
          }
          endDateControl={
            <EuiDatePicker
              selected={this.state.endDate}
              onChange={this.handleChangeEnd}
              startDate={this.state.startDate}
              endDate={this.state.endDate}
              isInvalid={this.state.startDate > this.state.endDate}
              aria-label="End date"
              calendarContainer={GlobalDatePopover}
              showTimeSelect
            />
          }
        />
      </EuiFormControlLayout>
    );
  }

  private handleChangeStart = (date: moment.Moment) => {
    this.setState({
      startDate: date,
    });
  };

  private handleChangeEnd = (date: moment.Moment) => {
    this.setState({
      endDate: date,
    });
  };

  private onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = () => {
    this.setState({
      isPopoverOpen: false,
    });
  };

  private renderQuickSelect = () => {
    const firstOptions = [{ value: 'last', text: 'Last' }, { value: 'previous', text: 'Previous' }];

    const lastOptions = [
      { value: 'seconds', text: 'seconds' },
      { value: 'minutes', text: 'minutes' },
      { value: 'hours', text: 'hours' },
      { value: 'days', text: 'days' },
      { value: 'weeks', text: 'weeks' },
      { value: 'months', text: 'months' },
      { value: 'years', text: 'years' },
    ];

    return (
      <Fragment>
        <EuiTitle size="xxxs">
          <span>Quick select</span>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiSelect options={firstOptions} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiFieldNumber aria-label="Count of" defaultValue="256" />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiSelect options={lastOptions} />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiButton onClick={this.closePopover} style={{ minWidth: 0 }}>
                Apply
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  };

  private renderCommonlyUsed = (recentlyCommonDates: string[]) => {
    const links = recentlyCommonDates.map(date => {
      return (
        <EuiFlexItem key={date}>
          <EuiLink onClick={this.closePopover}>{date}</EuiLink>
        </EuiFlexItem>
      );
    });

    return (
      <Fragment>
        <EuiTitle size="xxxs">
          <span>Commonly used</span>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiFlexGrid gutterSize="s" columns={2}>
            {links}
          </EuiFlexGrid>
        </EuiText>
      </Fragment>
    );
  };

  private renderRecentlyUsed = (recentDates: Array<string | string[]>) => {
    const links = recentDates.map((date: string | string[]) => {
      let dateRange;
      if (typeof date !== 'string') {
        dateRange = `${date[0]} – ${date[1]}`;
      }

      return (
        <EuiFlexItem grow={false} key={dateRange}>
          <EuiLink onClick={this.closePopover}>{dateRange || date}</EuiLink>
        </EuiFlexItem>
      );
    });

    return (
      <Fragment>
        <EuiTitle size="xxxs">
          <span>Recently used date ranges</span>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiText size="s">
          <EuiFlexGroup gutterSize="s" style={{ flexDirection: 'column' }}>
            {links}
          </EuiFlexGroup>
        </EuiText>
      </Fragment>
    );
  };
}
