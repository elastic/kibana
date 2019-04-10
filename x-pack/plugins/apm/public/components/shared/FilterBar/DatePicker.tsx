/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker, EuiSuperDatePickerProps } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { IReduxState } from '../../../store/rootReducer';
import {
  getUrlParams,
  IUrlParams,
  refreshTimeRange
} from '../../../store/urlParams';
import { fromQuery, toQuery } from '../Links/url_helpers';

interface DatePickerProps extends RouteComponentProps {
  dispatchRefreshTimeRange: typeof refreshTimeRange;
  urlParams: IUrlParams;
}

export class DatePickerComponent extends React.Component<DatePickerProps> {
  public updateUrl(nextQuery: {
    rangeFrom?: string;
    rangeTo?: string;
    refreshPaused?: boolean;
    refreshInterval?: number;
  }) {
    const { history, location } = this.props;
    history.push({
      ...location,
      search: fromQuery({ ...toQuery(location.search), ...nextQuery })
    });
  }

  public onRefreshChange: EuiSuperDatePickerProps['onRefreshChange'] = ({
    isPaused,
    refreshInterval
  }) => {
    this.updateUrl({ refreshPaused: isPaused, refreshInterval });
  };

  public onTimeChange: EuiSuperDatePickerProps['onTimeChange'] = ({
    start,
    end
  }) => {
    this.updateUrl({ rangeFrom: start, rangeTo: end });
  };

  public onRefresh: EuiSuperDatePickerProps['onRefresh'] = ({ start, end }) => {
    this.props.dispatchRefreshTimeRange({ rangeFrom: start, rangeTo: end });
  };

  public render() {
    const {
      rangeFrom,
      rangeTo,
      refreshPaused,
      refreshInterval
    } = this.props.urlParams;
    return (
      <EuiSuperDatePicker
        start={rangeFrom}
        end={rangeTo}
        isPaused={refreshPaused}
        refreshInterval={refreshInterval}
        onTimeChange={this.onTimeChange}
        onRefresh={this.onRefresh}
        onRefreshChange={this.onRefreshChange}
        showUpdateButton={true}
      />
    );
  }
}

const mapStateToProps = (state: IReduxState) => ({
  urlParams: getUrlParams(state)
});
const mapDispatchToProps = { dispatchRefreshTimeRange: refreshTimeRange };

const DatePicker = withRouter(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )(DatePickerComponent)
);

export { DatePicker };
