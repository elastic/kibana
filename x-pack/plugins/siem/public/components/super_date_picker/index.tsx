/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import {
  EuiSuperDatePicker,
  EuiSuperDatePickerProps,
  OnRefreshChangeProps,
  OnRefreshProps,
  OnTimeChangeProps,
} from '@elastic/eui';
import { get, getOr, take } from 'lodash/fp';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { inputsActions, inputsModel, State } from '../../store';

const MAX_RECENTLY_USED_RANGES = 9;

type MyEuiSuperDatePickerProps = Pick<
  EuiSuperDatePickerProps,
  | 'end'
  | 'isPaused'
  | 'onTimeChange'
  | 'onRefreshChange'
  | 'onRefresh'
  | 'recentlyUsedRanges'
  | 'refreshInterval'
  | 'showUpdateButton'
  | 'start'
> & {
  isLoading?: boolean;
};
const MyEuiSuperDatePicker: React.SFC<MyEuiSuperDatePickerProps> = EuiSuperDatePicker;

interface SuperDatePickerStateRedux {
  duration: number;
  kind: string;
  option: string;
  start: number;
  end: number;
  isLoading: boolean;
  refetch: inputsModel.Refetch[];
}

interface SuperDatePickerDispatchProps {
  setAbsoluteSuperDatePicker: ActionCreator<{ id: string; from: number; to: number }>;
  setRelativeSuperDatePicker: ActionCreator<{
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

interface TimeArgs {
  start: string;
  end: string;
}

export type SuperDatePickerProps = OwnProps &
  SuperDatePickerDispatchProps &
  SuperDatePickerStateRedux;

export interface SuperDatePickerState {
  isAutoRefreshOnly: boolean;
  isPaused: boolean;
  isQuickSelection: boolean;
  recentlyUsedRanges: TimeArgs[];
  refreshInterval: number;
  showUpdateButton: boolean;
}

export const SuperDatePickerComponent = class extends Component<
  SuperDatePickerProps,
  SuperDatePickerState
> {
  constructor(props: SuperDatePickerProps) {
    super(props);

    this.state = {
      isAutoRefreshOnly: false,
      isPaused: true,
      isQuickSelection: true,
      recentlyUsedRanges: [],
      refreshInterval: 300000,
      showUpdateButton: true,
    };
  }

  public render() {
    const { end, start, kind, option, isLoading } = this.props;
    const endDate = kind === 'relative' ? 'now' : new Date(end).toISOString();
    const startDate = kind === 'relative' ? option : new Date(start).toISOString();

    return (
      <MyEuiSuperDatePicker
        end={endDate}
        isLoading={isLoading}
        isPaused={this.state.isPaused}
        onTimeChange={this.onTimeChange}
        onRefreshChange={this.onRefreshChange}
        onRefresh={this.onRefresh}
        recentlyUsedRanges={this.state.recentlyUsedRanges}
        refreshInterval={this.state.refreshInterval}
        showUpdateButton={this.state.showUpdateButton}
        start={startDate}
      />
    );
  }
  private onRefresh = ({ start, end, refreshInterval }: OnRefreshProps): void => {
    this.updateReduxTime({
      start,
      end,
      isQuickSelection: this.state.isQuickSelection,
      isInvalid: false,
    });
    this.refetchQuery(this.props.refetch);
  };

  private onRefreshChange = ({ isPaused, refreshInterval }: OnRefreshChangeProps): void => {
    const { id, duration, stopAutoReload, startAutoReload } = this.props;

    if (duration !== refreshInterval) {
      this.props.setDuration({ id, duration: refreshInterval });
    }

    if (isPaused) {
      stopAutoReload({ id });
    } else {
      startAutoReload({ id });
    }

    if (!this.state.isQuickSelection) {
      this.refetchQuery(this.props.refetch);
    }

    this.setState({
      ...this.state,
      isPaused,
    });
  };

  private refetchQuery = (query: inputsModel.Refetch[]) => {
    query.forEach((refetch: inputsModel.Refetch) => refetch());
  };

  private formatDate = (date: string) => {
    const momentDate = dateMath.parse(date);
    return momentDate != null && momentDate.isValid() ? momentDate.valueOf() : 0;
  };

  private onTimeChange = ({ start, end, isQuickSelection, isInvalid }: OnTimeChangeProps) => {
    if (!isInvalid) {
      this.updateReduxTime({ start, end, isQuickSelection, isInvalid });
      this.setState((prevState: SuperDatePickerState) => {
        const recentlyUsedRanges = [
          { start, end },
          ...take(
            MAX_RECENTLY_USED_RANGES,
            prevState.recentlyUsedRanges.filter(
              recentlyUsedRange =>
                !(recentlyUsedRange.start === start && recentlyUsedRange.end === end)
            )
          ),
        ];

        return {
          recentlyUsedRanges,
          isQuickSelection,
        };
      });
    }
  };

  private updateReduxTime = ({ start, end, isQuickSelection }: OnTimeChangeProps) => {
    const { id, setAbsoluteSuperDatePicker, setRelativeSuperDatePicker } = this.props;

    if (isQuickSelection) {
      setRelativeSuperDatePicker({
        id,
        option: start,
        from: this.formatDate(start),
        to: this.formatDate(end),
      });
    } else {
      setAbsoluteSuperDatePicker({
        id,
        from: this.formatDate(start),
        to: this.formatDate(end),
      });
    }
  };
};

const mapStateToProps = (state: State, { id }: OwnProps) => {
  const myState = getOr({}, `inputs.${id}`, state);
  return {
    duration: get('policy.duration', myState),
    kind: get('timerange.kind', myState),
    start: get('timerange.from', myState),
    end: get('timerange.to', myState),
    option: get('timerange.option', myState),
    isLoading: myState.query.filter((i: inputsModel.GlobalQuery) => i.loading === true).length > 0,
    refetch: myState.query.map((i: inputsModel.GlobalQuery) => i.refetch),
  };
};

export const SuperDatePicker = connect(
  mapStateToProps,
  {
    setAbsoluteSuperDatePicker: inputsActions.setAbsoluteRangeDatePicker,
    setRelativeSuperDatePicker: inputsActions.setRelativeRangeDatePicker,
    startAutoReload: inputsActions.startAutoReload,
    stopAutoReload: inputsActions.stopAutoReload,
    setDuration: inputsActions.setDuration,
  }
)(SuperDatePickerComponent);
