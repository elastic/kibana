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
  startDate: moment.Moment | undefined;
  endDate: moment.Moment | undefined;
  onChangeRangeTime: (
    from: moment.Moment | undefined,
    to: moment.Moment | undefined,
    search: boolean
  ) => void;
  recentlyUsed: RecentlyUsed[];
  disabled?: boolean;
  isLoading?: boolean;
  ref?: React.RefObject<any>;
}

export interface RecentlyUsed {
  type: string;
  text: string | string[];
}

interface RangeDatePickerState {
  startDate: moment.Moment | undefined;
  endDate: moment.Moment | undefined;
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
    quickSelectTime: 1,
    quickSelectUnit: 'hours',
  };

  public render() {
    const { isLoading, disabled } = this.props;
    const { startDate, endDate } = this.state;
    const quickSelectButton = (
      <EuiButtonEmpty
        className="euiFormControlLayout__prepend"
        style={{ borderRight: 'none' }}
        onClick={this.onButtonClick}
        disabled={disabled}
        aria-label="Date quick select"
        size="xs"
        iconType="arrowDown"
        iconSide="right"
      >
        <EuiIcon type="calendar" />
      </EuiButtonEmpty>
    );

    const commonlyUsed = this.renderCommonlyUsed(commonDates);
    const recentlyUsed = this.renderRecentlyUsed([
      ...this.state.recentlyUsed,
      ...this.props.recentlyUsed,
    ]);

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
          disabled={disabled}
          fullWidth
          startDateControl={
            <EuiDatePicker
              dateFormat="L LTS"
              selected={startDate}
              onChange={this.handleChangeStart}
              isInvalid={startDate && endDate ? startDate > endDate : false}
              fullWidth
              aria-label="Start date"
              disabled={disabled}
              shouldCloseOnSelect
              showTimeSelect
            />
          }
          endDateControl={
            <EuiDatePicker
              dateFormat="L LTS"
              selected={endDate}
              onChange={this.handleChangeEnd}
              isInvalid={startDate && endDate ? startDate > endDate : false}
              fullWidth
              disabled={disabled}
              isLoading={isLoading}
              aria-label="End date"
              shouldCloseOnSelect
              showTimeSelect
              popperPlacement="top-end"
            />
          }
        />
      </EuiFormControlLayout>
    );
  }

  public resetRangeDate(startDate: moment.Moment, endDate: moment.Moment) {
    this.setState({
      ...this.state,
      startDate,
      endDate,
    });
  }

  private handleChangeStart = (date: moment.Moment | null) => {
    if (date && this.state.startDate !== date) {
      this.props.onChangeRangeTime(date, this.state.endDate, false);
      this.setState({
        startDate: date,
      });
    }
  };

  private handleChangeEnd = (date: moment.Moment | null) => {
    if (date && this.state.endDate !== date) {
      this.props.onChangeRangeTime(this.state.startDate, date, false);
      this.setState({
        endDate: date,
      });
    }
  };

  private onButtonClick = () => {
    this.setState({
      isPopoverOpen: !this.state.isPopoverOpen,
    });
  };

  private closePopover = (type: string, from?: string, to?: string) => {
    const { startDate, endDate, recentlyUsed } = this.managedStartEndDateFromType(type, from, to);
    this.setState(
      {
        ...this.state,
        isPopoverOpen: false,
        startDate,
        endDate,
        recentlyUsed,
      },
      () => {
        if (type) {
          this.props.onChangeRangeTime(startDate, endDate, true);
        }
      }
    );
  };

  private managedStartEndDateFromType(type: string, from?: string, to?: string) {
    let { startDate, endDate } = this.state;
    let recentlyUsed: RecentlyUsed[] = this.state.recentlyUsed;
    let textJustUsed = type;

    if (type === 'quick-select') {
      textJustUsed = `Last ${this.state.quickSelectTime} ${singularize(
        this.state.quickSelectUnit,
        this.state.quickSelectTime
      )}`;
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
    } else if (type === 'date-range' && to && from) {
      startDate = moment(from);
      endDate = moment(to);
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
      { value: 'seconds', text: singularize('seconds', this.state.quickSelectTime) },
      { value: 'minutes', text: singularize('minutes', this.state.quickSelectTime) },
      { value: 'hours', text: singularize('hours', this.state.quickSelectTime) },
      { value: 'days', text: singularize('days', this.state.quickSelectTime) },
      { value: 'weeks', text: singularize('weeks', this.state.quickSelectTime) },
      { value: 'months', text: singularize('months', this.state.quickSelectTime) },
      { value: 'years', text: singularize('years', this.state.quickSelectTime) },
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
                defaultValue="1"
                value={this.state.quickSelectTime}
                step={0}
                onChange={arg => {
                  this.onChange('quickSelectTime', arg);
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
    let value = args.currentTarget.value;

    if (stateType === 'quickSelectTime' && value !== '') {
      value = parseInt(args.currentTarget.value, 10);
    }
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
      let dateLink = (
        <EuiLink onClick={() => this.closePopover(date.type)}>{dateRange || date.text}</EuiLink>
      );
      if (typeof date.text !== 'string') {
        dateRange = `${date.text[0]} – ${date.text[1]}`;
        dateLink = (
          <EuiLink onClick={() => this.closePopover(date.type, date.text[0], date.text[1])}>
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

const singularize = (str: string, qty: number) => (qty === 1 ? str.slice(0, -1) : str);
