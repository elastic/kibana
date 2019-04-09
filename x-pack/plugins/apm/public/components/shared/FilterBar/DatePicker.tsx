/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiSuperDatePicker, EuiSuperDatePickerProps } from '@elastic/eui';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { IUrlParams, refreshTimeRange } from '../../../store/urlParams';
import { fromQuery, toQuery } from '../Links/url_helpers';
import { LocationContext } from '../../../context/LocationContext';

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

  public render() {
    return (
      <LocationContext.Consumer>
        {({ urlParams, refreshTimeRange }) => {
          const {
            rangeFrom,
            rangeTo,
            refreshPaused,
            refreshInterval
          } = urlParams;

          return (
            <EuiSuperDatePicker
              start={rangeFrom}
              end={rangeTo}
              isPaused={refreshPaused}
              refreshInterval={refreshInterval}
              onTimeChange={this.onTimeChange}
              onRefresh={({ start, end }) => {
                if (refreshTimeRange) {
                  refreshTimeRange({
                    rangeFrom: start,
                    rangeTo: end
                  });
                }
              }}
              onRefreshChange={this.onRefreshChange}
              showUpdateButton={true}
            />
          );
        }}
      </LocationContext.Consumer>
    );
  }
}

const DatePicker = withRouter(DatePickerComponent);
export { DatePicker };
