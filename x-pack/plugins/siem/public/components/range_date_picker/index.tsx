/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiDatePickerRange, EuiFlexGroup, EuiFlexItem, EuiFormControlLayout } from '@elastic/eui';
import { get, getOr, has, isEqual } from 'lodash/fp';
import moment, { Moment } from 'moment';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { inputsActions, inputsModel, State } from '../../store';

import { GlobalDateButton } from './global_date_button';
import { QuickSelectPopover } from './quick_select_popover';
import { UpdateButton } from './update_button';

export type DateType = 'relative' | 'absolute';

interface RangeDatePickerStateRedux {
  start: number;
  end: number;
  isTimerOn: boolean;
  duration: number;
  loading: boolean;
  refetch: inputsModel.Refetch[];
}

interface RangeDatePickerDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{ id: string; from: number; to: number }>;
  setRelativeRangeDatePicker: ActionCreator<{
    id: string;
    option: string;
    from: number;
    to: number;
  }>;
  startAutoReload: ActionCreator<{ id: string }>;
  stopAutoReload: ActionCreator<{ id: string }>;
  setDuration: ActionCreator<{ id: string; duration: number }>;
}
interface OwnProps {
  id: string;
  disabled?: boolean;
}

type RangeDatePickerProps = OwnProps & RangeDatePickerDispatchProps & RangeDatePickerStateRedux;

interface RecentylUsedBasic {
  kind: string;
  text: string;
}

interface RecentylUsedDateRange {
  kind: string;
  timerange: number[];
}

export type RecentlyUsedI = RecentylUsedBasic | RecentylUsedDateRange;

interface RangeDatePickerState {
  recentlyUsed: RecentlyUsedI[];
}

class RangeDatePickerComponents extends React.PureComponent<
  RangeDatePickerProps,
  RangeDatePickerState
> {
  public readonly state = {
    recentlyUsed: [] as RecentlyUsedI[],
  };

  public render() {
    const { recentlyUsed } = this.state;
    const { id, loading, disabled = false, start, end, isTimerOn, refetch } = this.props;

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
                  id={`${id}-from`}
                  date={moment(start)}
                  position="start"
                  onChange={this.handleChangeFrom}
                  isInvalid={start && end ? start > end : false}
                />
              }
              endDateControl={
                <GlobalDateButton
                  id={`${id}-to`}
                  date={moment(end)}
                  position="end"
                  onChange={this.handleChangeTo}
                  isInvalid={start && end ? start > end : false}
                />
              }
            />
          </EuiFormControlLayout>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <UpdateButton loading={loading} refetch={refetch} />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  private handleChangeFrom = (date: moment.Moment | null) => {
    const { id, end, start } = this.props;
    if (date && moment(start) !== date) {
      this.props.setAbsoluteRangeDatePicker({ id, from: date.valueOf(), to: end });
      this.updateRecentlyUsed({
        kind: 'date-range',
        timerange: [date.valueOf(), end],
      });
    }
  };

  private handleChangeTo = (date: moment.Moment | null) => {
    const { id, start, end } = this.props;
    if (date && moment(end) !== date) {
      this.props.setAbsoluteRangeDatePicker({ id, from: start, to: date.valueOf() });
      this.updateRecentlyUsed({
        kind: 'date-range',
        timerange: [start, date.valueOf()],
      });
    }
  };

  private updateRecentlyUsed = (msg?: RecentlyUsedI) => {
    const { recentlyUsed } = this.state;
    if (
      msg &&
      recentlyUsed.filter((i: RecentlyUsedI) => {
        const timerange = getOr(false, 'timerange', msg);
        const text = getOr(false, 'text', msg);
        if (timerange && has('timerange', i)) {
          return isEqual(timerange, get('timerange', i));
        } else if (text && has('text', i)) {
          return text === get('text', i);
        }
        return false;
      }).length === 0
    ) {
      recentlyUsed.unshift(msg);
      this.setState({
        ...this.state,
        recentlyUsed: recentlyUsed.slice(0, 5),
      });
    }
  };

  private onChange = (start: Moment, end: Moment, type: DateType, msg?: RecentlyUsedI) => {
    const { id } = this.props;
    if (type === 'absolute') {
      this.props.setAbsoluteRangeDatePicker({
        id,
        from: start.valueOf(),
        to: end.valueOf(),
      });
    } else if (type === 'relative') {
      this.props.setRelativeRangeDatePicker({
        id,
        option: msg ? msg.kind : '',
        from: start.valueOf(),
        to: end.valueOf(),
      });
    }
    this.updateRecentlyUsed(msg);
  };

  private updateTimer = (isTimerOn: boolean, duration: number, durationKind: string) => {
    const { id } = this.props;
    this.props.setDuration({
      id,
      duration: moment
        .duration(duration, durationKind as moment.unitOfTime.DurationConstructor)
        .asMilliseconds(),
    });
    if (isTimerOn) {
      this.props.startAutoReload({ id });
    } else {
      this.props.stopAutoReload({ id });
    }
  };
}

const mapStateToProps = (state: State, { id }: OwnProps) => {
  const myState = getOr({}, `inputs.${id}`, state);
  return {
    start: get('timerange.from', myState),
    end: get('timerange.to', myState),
    isTimerOn: get('policy.kind', myState) === 'interval',
    duration: get('policy.duration', myState),
    loading: myState.query.filter((i: inputsModel.GlobalQuery) => i.loading === true).length > 0,
    refetch: myState.query.map((i: inputsModel.GlobalQuery) => i.refetch),
  };
};

export const RangeDatePicker = connect(
  mapStateToProps,
  {
    setAbsoluteRangeDatePicker: inputsActions.setAbsoluteRangeDatePicker,
    setRelativeRangeDatePicker: inputsActions.setRelativeRangeDatePicker,
    startAutoReload: inputsActions.startAutoReload,
    stopAutoReload: inputsActions.stopAutoReload,
    setDuration: inputsActions.setDuration,
  }
)(RangeDatePickerComponents);
