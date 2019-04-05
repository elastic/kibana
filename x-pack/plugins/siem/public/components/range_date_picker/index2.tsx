/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { EuiSpacer, EuiSuperDatePicker } from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { inputsActions, inputsModel, State } from '../../store';

interface RangeDatePickerStateRedux {
  start: number;
  end: number;
  isLoading: boolean;
}

interface RangeDatePickerDispatchProps {
  setAbsoluteRangeDatePicker: ActionCreator<{ id: string; from: number; to: number }>;
}
interface OwnProps {
  id: string;
  disabled?: boolean;
}

type RangeDatePickerProps = OwnProps & RangeDatePickerDispatchProps & RangeDatePickerStateRedux;

interface TimeArgs {
  end: string;
  start: string;
}
interface RefreshArgs extends TimeArgs {
  refreshInterval: number;
}

interface RefreshChangeArgs {
  isPaused: boolean;
  refreshInterval: number;
}

interface RangeDatePickerState extends RefreshChangeArgs {
  isAutoRefreshOnly: boolean;
  isLoading: boolean;
  recentlyUsedRanges: TimeArgs[];
  showUpdateButton: boolean;
}

const RangeDatePickerComponents = class extends Component<
  RangeDatePickerProps,
  RangeDatePickerState
> {
  constructor(props: RangeDatePickerProps) {
    super(props);

    const { isLoading } = props;
    this.state = {
      isAutoRefreshOnly: false,
      isLoading,
      isPaused: false,
      recentlyUsedRanges: [],
      refreshInterval: 1000,
      showUpdateButton: true,
    };
  }

  public render() {
    const { end, start } = this.props;
    return (
      <>
        <EuiSuperDatePicker
          end={new Date(end).toISOString()}
          isLoading={this.state.isLoading}
          isPaused={this.state.isPaused}
          onRefresh={this.onRefresh}
          onRefreshChange={this.onRefreshChange}
          onTimeChange={this.onTimeChange}
          recentlyUsedRanges={this.state.recentlyUsedRanges}
          refreshInterval={this.state.refreshInterval}
          showUpdateButton={this.state.showUpdateButton}
          start={new Date(start).toISOString()}
        />

        <EuiSpacer />
      </>
    );
  }

  private formatDate = (date: string) => {
    const momentDate = dateMath.parse(date);
    return momentDate ? momentDate.valueOf() : 0;
  };

  private onTimeChange = ({ start, end }: TimeArgs) => {
    const { id, setAbsoluteRangeDatePicker } = this.props;
    setAbsoluteRangeDatePicker({
      id,
      from: this.formatDate(start),
      to: this.formatDate(end),
    });
    this.setState((prevState: RangeDatePickerState) => {
      const recentlyUsedRanges = prevState.recentlyUsedRanges.filter(recentlyUsedRange => {
        const isDuplicate = recentlyUsedRange.start === start && recentlyUsedRange.end === end;
        return !isDuplicate;
      });
      recentlyUsedRanges.unshift({ start, end });
      return {
        recentlyUsedRanges:
          recentlyUsedRanges.length > 10 ? recentlyUsedRanges.slice(0, 9) : recentlyUsedRanges,
        isLoading: true,
      };
    }, this.startLoading);
  };

  private onRefresh = ({ start, end, refreshInterval }: RefreshArgs) => {
    return new Promise(resolve => {
      setTimeout(resolve, 100);
    }).then(() => {
      console.log(start, end, refreshInterval);
    });
  };

  private startLoading = () => {
    setTimeout(this.stopLoading, 1000);
  };

  private stopLoading = () => {
    this.setState({ isLoading: false });
  };

  private onRefreshChange = ({ isPaused, refreshInterval }: RefreshChangeArgs) => {
    this.setState({
      isPaused,
      refreshInterval,
    });
  };
};

const mapStateToProps = (state: State, { id }: OwnProps) => {
  const myState = getOr({}, `inputs.${id}`, state);
  return {
    start: get('timerange.from', myState),
    end: get('timerange.to', myState),
    isLoading: myState.query.filter((i: inputsModel.GlobalQuery) => i.loading === true).length > 0,
  };
};

export const RangeDatePicker2 = connect(
  mapStateToProps,
  {
    setAbsoluteRangeDatePicker: inputsActions.setAbsoluteRangeDatePicker,
  }
)(RangeDatePickerComponents);
