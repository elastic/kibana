/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import { FormattedMessage, InjectedIntl, injectI18n } from '@kbn/i18n/react';
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
  i18n.translate('xpack.infra.rangeDatePicker.todayText', {
    defaultMessage: 'Today',
  }),
  i18n.translate('xpack.infra.rangeDatePicker.yesterdayText', {
    defaultMessage: 'Yesterday',
  }),
  i18n.translate('xpack.infra.rangeDatePicker.thisWeekText', {
    defaultMessage: 'This week',
  }),
  i18n.translate('xpack.infra.rangeDatePicker.weekToDateText', {
    defaultMessage: 'Week to date',
  }),
  i18n.translate('xpack.infra.rangeDatePicker.thisMonthText', {
    defaultMessage: 'This month',
  }),
  i18n.translate('xpack.infra.rangeDatePicker.monthToDateText', {
    defaultMessage: 'Month to date',
  }),
  i18n.translate('xpack.infra.rangeDatePicker.thisYearText', {
    defaultMessage: 'This year',
  }),
  i18n.translate('xpack.infra.rangeDatePicker.yearToDateText', {
    defaultMessage: 'Year to date',
  }),
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
  intl: InjectedIntl;
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

class RangeDatePickerUI extends React.PureComponent<RangeDatePickerProps, RangeDatePickerState> {
  public readonly state = {
    startDate: this.props.startDate,
    endDate: this.props.endDate,
    isPopoverOpen: false,
    recentlyUsed: [],
    quickSelectTime: 1,
    quickSelectUnit: 'hours',
  };

  public render() {
    const { isLoading, disabled, intl } = this.props;
    const { startDate, endDate } = this.state;
    const quickSelectButton = (
      <EuiButtonEmpty
        className="euiFormControlLayout__prepend"
        style={{ borderRight: 'none' }}
        onClick={this.onButtonClick}
        disabled={disabled}
        aria-label={intl.formatMessage({
          id: 'xpack.infra.rangeDatePicker.dateQuickSelectAriaLabel',
          defaultMessage: 'Date quick select',
        })}
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
              aria-label={intl.formatMessage({
                id: 'xpack.infra.rangeDatePicker.startDateAriaLabel',
                defaultMessage: 'Start date',
              })}
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
              aria-label={intl.formatMessage({
                id: 'xpack.infra.rangeDatePicker.endDateAriaLabel',
                defaultMessage: 'End date',
              })}
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
    const { intl } = this.props;
    let { startDate, endDate } = this.state;
    let recentlyUsed: RecentlyUsed[] = this.state.recentlyUsed;
    let textJustUsed = type;

    if (type === 'quick-select') {
      textJustUsed = intl.formatMessage(
        {
          id: 'xpack.infra.rangeDatePicker.lastQuickSelectTimeText',
          defaultMessage: 'Last {quickSelectTime} {quickSelectTimeUnit}',
        },
        {
          quickSelectTime: this.state.quickSelectTime,
          quickSelectTimeUnit: singularize(this.state.quickSelectUnit, this.state.quickSelectTime),
        }
      );
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
    const { intl } = this.props;
    const lastOptions = [
      {
        value: 'seconds',
        text: intl.formatMessage(
          {
            id: 'xpack.infra.rangeDatePicker.unitOptions.secondsLabel',
            defaultMessage: '{quickSelectTime, plural, one {second} other {seconds}}',
          },
          {
            quickSelectTime: this.state.quickSelectTime,
          }
        ),
      },
      {
        value: 'minutes',
        text: intl.formatMessage(
          {
            id: 'xpack.infra.rangeDatePicker.unitOptions.minutesLabel',
            defaultMessage: '{quickSelectTime, plural, one {minute} other {minutes}}',
          },
          {
            quickSelectTime: this.state.quickSelectTime,
          }
        ),
      },
      {
        value: 'hours',
        text: intl.formatMessage(
          {
            id: 'xpack.infra.rangeDatePicker.unitOptions.hoursLabel',
            defaultMessage: '{quickSelectTime, plural, one {hour} other {hours}}',
          },
          {
            quickSelectTime: this.state.quickSelectTime,
          }
        ),
      },
      {
        value: 'days',
        text: intl.formatMessage(
          {
            id: 'xpack.infra.rangeDatePicker.unitOptions.daysLabel',
            defaultMessage: '{quickSelectTime, plural, one {day} other {days}}',
          },
          {
            quickSelectTime: this.state.quickSelectTime,
          }
        ),
      },
      {
        value: 'weeks',
        text: intl.formatMessage(
          {
            id: 'xpack.infra.rangeDatePicker.unitOptions.weeksLabel',
            defaultMessage: '{quickSelectTime, plural, one {week} other {weeks}}',
          },
          {
            quickSelectTime: this.state.quickSelectTime,
          }
        ),
      },
      {
        value: 'months',
        text: intl.formatMessage(
          {
            id: 'xpack.infra.rangeDatePicker.unitOptions.monthsLabel',
            defaultMessage: '{quickSelectTime, plural, one {month} other {months}}',
          },
          {
            quickSelectTime: this.state.quickSelectTime,
          }
        ),
      },
      {
        value: 'years',
        text: intl.formatMessage(
          {
            id: 'xpack.infra.rangeDatePicker.unitOptions.yearsLabel',
            defaultMessage: '{quickSelectTime, plural, one {year} other {years}}',
          },
          {
            quickSelectTime: this.state.quickSelectTime,
          }
        ),
      },
    ];

    return (
      <Fragment>
        <EuiTitle size="xxxs">
          <span>
            <FormattedMessage
              id="xpack.infra.rangeDatePicker.quickSelectTitle"
              defaultMessage="Quick select"
            />
          </span>
        </EuiTitle>
        <EuiSpacer size="s" />
        <EuiFlexGroup gutterSize="s" responsive={false}>
          <EuiFlexItem>
            <EuiTitle size="s">
              <span>
                <FormattedMessage
                  id="xpack.infra.rangeDatePicker.lastQuickSelectTitle"
                  defaultMessage="Last"
                />
              </span>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFormRow>
              <EuiFieldNumber
                aria-label={intl.formatMessage({
                  id: 'xpack.infra.rangeDatePicker.countOfFormRowAriaLabel',
                  defaultMessage: 'Count of',
                })}
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
                <FormattedMessage
                  id="xpack.infra.rangeDatePicker.applyFormRowButtonLabel"
                  defaultMessage="Apply"
                />
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
          <span>
            <FormattedMessage
              id="xpack.infra.rangeDatePicker.renderCommonlyUsedLinksTitle"
              defaultMessage="Commonly used"
            />
          </span>
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
          <span>
            <FormattedMessage
              id="xpack.infra.rangeDatePicker.recentlyUsedDateRangesTitle"
              defaultMessage="Recently used date ranges"
            />
          </span>
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

export const RangeDatePicker = injectI18n(RangeDatePickerUI);
