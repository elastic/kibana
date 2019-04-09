/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import dateMath from '@elastic/datemath';
import { EuiSuperDatePicker } from '@elastic/eui';
import { get, getOr } from 'lodash/fp';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'typescript-fsa';

import { inputsActions, inputsModel, State } from '../../store';

interface SuperDatePickerStateRedux {
  start: number;
  end: number;
  isLoading: boolean;
}

interface SuperDatePickerDispatchProps {
  setAbsoluteSuperDatePicker: ActionCreator<{ id: string; from: number; to: number }>;
}
interface OwnProps {
  id: string;
  disabled?: boolean;
}

export type SuperDatePickerProps = OwnProps &
  SuperDatePickerDispatchProps &
  SuperDatePickerStateRedux;

interface TimeArgs {
  end: string;
  start: string;
}

export interface SuperDatePickerState {
  isAutoRefreshOnly: boolean;
  isLoading: boolean;
  isPaused: boolean;
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

    const { isLoading } = props;
    this.state = {
      isAutoRefreshOnly: false,
      isLoading,
      isPaused: false,
      recentlyUsedRanges: [],
      refreshInterval: 300000,
      showUpdateButton: true,
    };
  }

  public render() {
    const { end, start } = this.props;
    return (
      // @ts-ignore -- TODO: EuiSuperDatePicker needs isLoading in prop-types
      <EuiSuperDatePicker
        end={new Date(end).toISOString()}
        isLoading={this.state.isLoading}
        isPaused={this.state.isPaused}
        onTimeChange={this.onTimeChange}
        recentlyUsedRanges={this.state.recentlyUsedRanges}
        refreshInterval={this.state.refreshInterval}
        showUpdateButton={this.state.showUpdateButton}
        start={new Date(start).toISOString()}
      />
    );
  }

  public componentWillReceiveProps(nextProps: SuperDatePickerProps) {
    this.setState({
      isLoading: nextProps.isLoading,
    });
  }

  private formatDate = (date: string) => {
    const momentDate = dateMath.parse(date);
    return momentDate ? momentDate.valueOf() : 0;
  };

  private onTimeChange = ({ start, end }: TimeArgs) => {
    const { id, setAbsoluteSuperDatePicker } = this.props;
    setAbsoluteSuperDatePicker({
      id,
      from: this.formatDate(start),
      to: this.formatDate(end),
    });
    this.setState((prevState: SuperDatePickerState) => {
      let recentlyUsedRanges = prevState.recentlyUsedRanges.filter(
        recentlyUsedRange => !(recentlyUsedRange.start === start && recentlyUsedRange.end === end)
      );
      recentlyUsedRanges =
        recentlyUsedRanges.length > 9
          ? [{ start, end }, ...recentlyUsedRanges.slice(0, 9)]
          : [{ start, end }, ...recentlyUsedRanges];

      return {
        recentlyUsedRanges,
        isLoading: true,
      };
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

export const SuperDatePicker = connect(
  mapStateToProps,
  {
    setAbsoluteSuperDatePicker: inputsActions.setAbsoluteRangeDatePicker,
  }
)(SuperDatePickerComponent);
