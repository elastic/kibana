/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { find } from 'lodash';
import moment from 'moment';
import React, { Fragment } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiDatePicker,
  EuiDatePickerRange,
  EuiFieldNumber,
  EuiFlexGrid,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
  EuiFormRow,
  EuiHorizontalRule,
  EuiIcon,
  EuiLink,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
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

interface RangeDatePickerProps {
  startDate: moment.Moment;
  endDate: moment.Moment;
  onChangeRangeTime: (to: moment.Moment, from: moment.Moment, search: boolean) => void;
}

interface RecentlyUsed {
  type: string;
  text: string | string[];
}

interface RangeDatePickerState {
  startDate: moment.Moment;
  endDate: moment.Moment;
  isPopoverOpen: boolean;
  recentlyUsed: RecentlyUsed[];
  quickSelectTime: number;
  quickSelectUnit: string;
}

export class RangeDatePicker extends React.PureComponent<
  RangeDatePickerProps,
  RangeDatePickerState
> {
  public readonly state = {
    startDate: this.props.startDate,
    endDate: this.props.endDate,
    isPopoverOpen: false,
    recentlyUsed: [],
    quickSelectTime: 256,
    quickSelectUnit: 'seconds',
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
          iconType={false}
          startDateControl={
            <EuiDatePicker
              selected={this.state.startDate}
              onChange={this.handleChangeStart}
              startDate={this.state.startDate}
              endDate={this.state.endDate}
              isInvalid={this.state.startDate > this.state.endDate}
              aria-label="Start date"
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
    this.props.onChangeRangeTime(date, this.state.endDate, false);
  };

  private handleChangeEnd = (date: moment.Moment) => {
    this.setState({
      endDate: date,
    });
    this.props.onChangeRangeTime(this.state.startDate, date, false);
  };

  private onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = (type: string) => {
    const { startDate, endDate, recentlyUsed } = this.managedStartEndDateFromType(type);
    this.setState(
      {
        ...this.state,
        isPopoverOpen: false,
        startDate,
        endDate,
        recentlyUsed,
      },
      () => {
        this.props.onChangeRangeTime(startDate, endDate, true);
      }
    );
  };

  private managedStartEndDateFromType(type: string) {
    let startDate = this.state.startDate;
    let endDate = this.state.endDate;
    let recentlyUsed: RecentlyUsed[] = this.state.recentlyUsed;
    let textJustUsed = type;

    if (type === 'quick-select') {
      textJustUsed = `Last ${this.state.quickSelectTime} ${this.state.quickSelectUnit}`;
      startDate = moment().subtract(this.state.quickSelectTime, this.state
        .quickSelectUnit as moment.unitOfTime.DurationConstructor);
      endDate = moment();
    } else if (type === 'Today') {
      startDate = moment().startOf('day');
      endDate = moment()
        .startOf('day')
        .add(24, 'hour');
    } else if (type === 'Yesterday') {
      startDate = moment()
        .subtract(1, 'day')
        .startOf('day');
      endDate = moment()
        .subtract(1, 'day')
        .startOf('day')
        .add(24, 'hour');
    } else if (type === 'This week') {
      startDate = moment().startOf('week');
      endDate = moment()
        .startOf('week')
        .add(1, 'week');
    } else if (type === 'Week to date') {
      startDate = moment().subtract(1, 'week');
      endDate = moment();
    } else if (type === 'This month') {
      startDate = moment().startOf('month');
      endDate = moment()
        .startOf('month')
        .add(1, 'month');
    } else if (type === 'Month to date') {
      startDate = moment().subtract(1, 'month');
      endDate = moment();
    } else if (type === 'This year') {
      startDate = moment().startOf('year');
      endDate = moment()
        .startOf('year')
        .add(1, 'year');
    } else if (type === 'Year to date') {
      startDate = moment().subtract(1, 'year');
      endDate = moment();
    }

    if (textJustUsed !== undefined && !find(recentlyUsed, ['text', textJustUsed])) {
      recentlyUsed.unshift({ type, text: textJustUsed });
      recentlyUsed = recentlyUsed.slice(0, 5);
    }

    return {
      startDate,
      endDate,
      recentlyUsed,
    };
  }

  private renderQuickSelect = () => {
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
            <EuiTitle size="s">
              <span>Last</span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiFieldNumber
                aria-label="Count of"
                defaultValue="256"
                onChange={arg => {
                  this.onChange('quickSelectOrder', arg);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiSelect
                value={this.state.quickSelectUnit}
                options={lastOptions}
                onChange={arg => {
                  this.onChange('quickSelectUnit', arg);
                }}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFormRow>
              <EuiButton onClick={() => this.closePopover('quick-select')} style={{ minWidth: 0 }}>
                Apply
              </EuiButton>
            </EuiFormRow>
          </EuiFlexItem>
        </EuiFlexGroup>
      </Fragment>
    );
  };

  private onChange = (stateType: string, args: any) => {
    const value = args.currentTarget.value;
    this.setState({
      ...this.state,
      [stateType]: value,
    });
  };

  private renderCommonlyUsed = (recentlyCommonDates: string[]) => {
    const links = recentlyCommonDates.map(date => {
      return (
        <EuiFlexItem key={date}>
          <EuiLink onClick={() => this.closePopover(date)}>{date}</EuiLink>
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

  private renderRecentlyUsed = (recentDates: RecentlyUsed[]) => {
    const links = recentDates.map((date: RecentlyUsed) => {
      let dateRange;
      if (typeof date.text !== 'string') {
        dateRange = `${date.text[0]} – ${date.text[1]}`;
      }

      return (
        <EuiFlexItem grow={false} key={`${dateRange || date.type}`}>
          <EuiLink onClick={() => this.closePopover(date.type)}>{dateRange || date.type}</EuiLink>
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
