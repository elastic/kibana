/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import { EuiSuperDatePicker, EuiSuperDatePickerProps } from '@elastic/eui';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import {
  TIMEPICKER_DEFAULTS,
  toBoolean,
  toNumber,
  updateTimePicker
} from '../../../store/urlParams';
import { fromQuery, toQuery } from '../Links/url_helpers';

export interface DatePickerProps extends RouteComponentProps {
  dispatchUpdateTimePicker: typeof updateTimePicker;
}

export class DatePickerComponent extends React.Component<DatePickerProps> {
  public refreshTimeoutId = 0;

  public getParamsFromSearch = (search: string) => {
    const { rangeFrom, rangeTo, refreshPaused, refreshInterval } = {
      ...TIMEPICKER_DEFAULTS,
      ...toQuery(search)
    };
    return {
      rangeFrom,
      rangeTo,
      refreshPaused: toBoolean(refreshPaused),
      refreshInterval: toNumber(refreshInterval)
    };
  };

  public componentDidMount() {
    this.dispatchTimeRangeUpdate();
  }

  public componentDidUpdate() {
    this.dispatchTimeRangeUpdate();
  }

  public dispatchTimeRangeUpdate() {
    const { rangeFrom, rangeTo } = this.getParamsFromSearch(
      this.props.location.search
    );
    const parsed = {
      from: datemath.parse(rangeFrom),
      // roundUp: true is required for the quick select relative date values to work properly
      to: datemath.parse(rangeTo, { roundUp: true })
    };
    if (!parsed.from || !parsed.to) {
      return;
    }
    const min = parsed.from.toISOString();
    const max = parsed.to.toISOString();
    this.props.dispatchUpdateTimePicker({ min, max });
  }

  public updateUrl(nextQuery: {
    rangeFrom?: string;
    rangeTo?: string;
    refreshPaused?: boolean;
    refreshInterval?: number;
  }) {
    const currentQuery = toQuery(this.props.location.search);
    const nextSearch = fromQuery({ ...currentQuery, ...nextQuery });

    // Compare the encoded versions of current and next search string, and if they're the same,
    // use replace instead of push to prevent an unnecessary stack entry which breaks the back button.
    const currentSearch = fromQuery(currentQuery);
    const { push, replace } = this.props.history;
    const update = currentSearch === nextSearch ? replace : push;

    update({ ...this.props.location, search: nextSearch });
  }

  public handleRefreshChange: EuiSuperDatePickerProps['onRefreshChange'] = ({
    isPaused,
    refreshInterval
  }) => {
    this.updateUrl({
      refreshPaused: isPaused,
      refreshInterval
    });
  };

  public handleTimeChange = (options: { start: string; end: string }) => {
    this.updateUrl({ rangeFrom: options.start, rangeTo: options.end });
  };

  public render() {
    const {
      rangeFrom,
      rangeTo,
      refreshPaused,
      refreshInterval
    } = this.getParamsFromSearch(this.props.location.search);
    return (
      <EuiSuperDatePicker
        start={rangeFrom}
        end={rangeTo}
        isPaused={refreshPaused}
        refreshInterval={refreshInterval}
        onTimeChange={this.handleTimeChange}
        onRefresh={this.handleTimeChange}
        onRefreshChange={this.handleRefreshChange}
        showUpdateButton={true}
      />
    );
  }
}

const DatePicker = withRouter(
  connect(
    null,
    { dispatchUpdateTimePicker: updateTimePicker }
  )(DatePickerComponent)
);

export { DatePicker };
