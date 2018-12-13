/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiDatePickerRange,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormControlLayout,
} from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import moment, { Moment } from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { inputsActions, State } from '../../store';
import { GlobalDateButton } from './global_date_button';
import { QuickSelectPopover } from './quick_select_popover';

export type DateType = 'relative' | 'absolute';

interface RangeDatePickerStateRedux {
  from: number;
  to: number;
  isTimerOn: boolean;
  interval: number;
  intervalType: string;
}

interface RangeDatePickerDispatchProps {
  setRangeDatePicker: (params: { id: string; type: string; from: number; to: number }) => void;
  startAutoReload: (params: { id: string }) => void;
  stopAutoReload: (params: { id: string }) => void;
  setInterval: (params: { id: string; interval: number; intervalType: string }) => void;
}
interface OwnProps {
  id: string;
  disabled?: boolean;
  isLoading?: boolean;
}

type RangeDatePickerProps = OwnProps & RangeDatePickerDispatchProps & RangeDatePickerStateRedux;

export interface RecentlyUsedI {
  type: string;
  text: string | string[];
}

interface RangeDatePickerState {
  recentlyUsed: RecentlyUsedI[];
}

export class RangeDatePickerComponents extends React.PureComponent<
  RangeDatePickerProps,
  RangeDatePickerState
> {
  public readonly state = {
    recentlyUsed: [] as RecentlyUsedI[],
  };

  public render() {
    const { recentlyUsed } = this.state;
    const { id, isLoading = false, disabled = false, from, to, isTimerOn } = this.props;

    const quickSelectPopover = (
      <QuickSelectPopover
        disabled={disabled}
        recentlyUsed={recentlyUsed}
        isTimerOn={isTimerOn}
        onChange={this.onChange}
        updateAutoReload={this.updateTimer}
      />
    );

    return (
      <EuiFlexGroup gutterSize="s" responsive={false}>
        <EuiFlexItem style={{ maxWidth: 480 }}>
          <EuiFormControlLayout className="euiGlobalDatePicker" prepend={quickSelectPopover}>
            <EuiDatePickerRange
              className="euiDatePickerRange--inGroup"
              iconType={false}
              isCustom
              startDateControl={
                <GlobalDateButton
                  id={`${id}From`}
                  date={moment(from)}
                  position="start"
                  onChange={this.handleChangeFrom}
                  isInvalid={from && to ? from > to : false}
                />
              }
              endDateControl={
                <GlobalDateButton
                  id={`${id}To`}
                  date={moment(to)}
                  position="end"
                  onChange={this.handleChangeTo}
                  isInvalid={from && to ? from > to : false}
                />
              }
            />
          </EuiFormControlLayout>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>{this.renderUpdateButton(isLoading!)}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private renderUpdateButton = (isLoading: boolean) => {
    const color = isLoading ? 'secondary' : 'primary';
    const icon = 'refresh';
    let text = 'Refresh';

    if (isLoading) {
      text = 'Updating';
    }

    return (
      <EuiButton
        isLoading={isLoading}
        className="euiGlobalDatePicker__updateButton"
        color={color}
        fill
        iconType={icon}
        textProps={{ className: 'euiGlobalDatePicker__updateButtonText' }}
      >
        {text}
      </EuiButton>
    );
  };

  private handleChangeFrom = (date: moment.Moment | null) => {
    const { id, to } = this.props;
    if (date && moment(this.props.from) !== date) {
      this.props.setRangeDatePicker({ id, type: 'absolute', from: date.valueOf(), to });
      this.updateRecentlyUsed({
        type: 'date-range',
        text: `${date.format('L LTS')} - ${moment(to).format('L LTS')}`,
      });
    }
  };

  private handleChangeTo = (date: moment.Moment | null) => {
    const { id, from } = this.props;
    if (date && moment(this.props.to) !== date) {
      this.props.setRangeDatePicker({ id, type: 'absolute', from, to: date.valueOf() });
      this.updateRecentlyUsed({
        type: 'date-range',
        text: `${moment(from).format('L LTS')} - ${date.format('L LTS')}`,
      });
    }
  };

  private updateRecentlyUsed = (msg?: RecentlyUsedI) => {
    const { recentlyUsed } = this.state;
    if (msg && recentlyUsed.filter((i: RecentlyUsedI) => i.text === msg.text).length === 0) {
      recentlyUsed.unshift(msg);
      this.setState({
        ...this.state,
        recentlyUsed: recentlyUsed.slice(0, 5),
      });
    }
  };

  private onChange = (from: Moment, to: Moment, type: DateType, msg?: RecentlyUsedI) => {
    const { id } = this.props;
    this.props.setRangeDatePicker({
      id,
      type: type.toString(),
      from: from.valueOf(),
      to: to.valueOf(),
    });
    this.updateRecentlyUsed(msg);
  };

  private updateTimer = (isTimerOn: boolean, interval: number, intervalType: string) => {
    const { id } = this.props;
    this.props.setInterval({
      id,
      interval,
      intervalType,
    });
    if (isTimerOn) {
      this.props.startAutoReload({ id });
    } else {
      this.props.stopAutoReload({ id });
    }
  };
}

const mapStateToProps = (state: State, { id }: OwnProps) => {
  const myState = getOr({}, `local.inputs.${id}`, state);
  return {
    from: get('timerange.from', myState),
    to: get('timerange.to', myState),
    isTimerOn: get('policy.type', myState) === 'interval',
    interval: get('policy.interval', myState),
    intervalType: get('policy.intervalType', myState),
  };
};

export const RangeDatePicker = connect(
  mapStateToProps,
  {
    setRangeDatePicker: inputsActions.setRangeDatePicker,
    startAutoReload: inputsActions.startAutoReload,
    stopAutoReload: inputsActions.stopAutoReload,
    setInterval: inputsActions.setInterval,
  }
)(RangeDatePickerComponents);
