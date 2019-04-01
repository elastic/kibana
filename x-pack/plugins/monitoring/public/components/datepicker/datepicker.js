/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker } from '@elastic/eui';
import React, { Component } from 'react';
import { connect } from 'react-redux';
import { withRouter } from 'react-router-dom';
import { fetchDate, refreshActiveRouteData, updateRefreshIntervalFromDatePicker, updateTimeFromDatePicker } from '../../store/actions';
import { getIsPaused, getStartTime, getRefreshInterval, getEndTime, getDateIsSet } from '../../store/selectors';
// import { routeList } from '../../routes';
// import {
//   TIMEPICKER_DEFAULTS,
//   toBoolean,
//   toNumber,
//   updateTimePicker
// } from '../../../store/urlParams';
// import { fromQuery, toQuery } from '../Links/url_helpers';


export class DatePickerComponent extends Component {
  constructor(props) {
    super(props);

    this.refreshTimeoutId = 0;
  }

  componentWillMount() {
    this.fetchDate();
  }

  fetchDate() {
    this.props.dispatchFetchDate();
  }

  handleRefreshChange = (options) => {
    this.handleUpdate(options);
  };

  handleTimeChange = (options) => {
    const { start, end, mode } = options;
    this.handleUpdate({
      from: start,
      to: end,
      mode,
    });
  };

  handleUpdate = (options) => {
    if (options.hasOwnProperty('isPaused') && options.hasOwnProperty('refreshInterval')) {
      this.props.dispatchUpdateRefreshInterval(options);
    } else {
      this.props.dispatchUpdateTime(options);
    }
  }

  handleRefresh = () => {
    // this.props.dispatchRefreshData();
  }

  render() {
    const {
      start,
      end,
      refreshInterval,
      isPaused,
      isSet
    } = this.props;

    if (!isSet) {
      return null;
    }

    return (
      <EuiSuperDatePicker
        start={start}
        end={end}
        refreshInterval={refreshInterval}
        isPaused={isPaused === true}
        onTimeChange={this.handleTimeChange}
        onRefresh={this.handleRefresh}
        onRefreshChange={this.handleRefreshChange}
        showUpdateButton={true}
      />
    );
  }
}

const DatePicker = withRouter(
  connect(
    state => ({
      isSet: getDateIsSet(state),
      refreshInterval: getRefreshInterval(state),
      isPaused: getIsPaused(state),
      start: getStartTime(state),
      end: getEndTime(state),
    }),
    {
      dispatchUpdateTime: updateTimeFromDatePicker,
      dispatchUpdateRefreshInterval: updateRefreshIntervalFromDatePicker,
      dispatchFetchDate: fetchDate,
      dispatchRefreshData: refreshActiveRouteData
    }
  )(DatePickerComponent)
);

export { DatePicker };
