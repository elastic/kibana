/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import datemath from '@elastic/datemath';
import {
  CommonProps,
  EuiSuperDatePicker,
  EuiSuperDatePickerProps
} from '@elastic/eui';
import { memoize } from 'lodash';
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import {
  toNumber,
  updateTimePicker
} from 'x-pack/plugins/apm/public/store/urlParams';
import { fromQuery, toQuery } from '../Links/url_helpers';

interface Props extends RouteComponentProps {
  dispatchUpdateTimePicker: typeof updateTimePicker;
}

interface DatePickerParams {
  rangeFrom: string;
  rangeTo: string;
  refreshPaused: boolean;
  refreshInterval: number;
}

// TODO this can be removed when EUI PR lands: https://github.com/elastic/eui/pull/1574
declare module '@elastic/eui' {
  interface OnTimeChangeProps {
    start: string;
    end: string;
    isInvalid: boolean;
    isQuickSelection: boolean;
  }

  interface OnRefreshChangeProps {
    isPaused: boolean;
    refreshInterval: number;
  }

  export type EuiSuperDatePickerProps = CommonProps & {
    start?: string;
    end?: string;
    isPaused?: boolean;
    refreshInterval?: number;
    onTimeChange: (props: OnTimeChangeProps) => void;
    onRefreshChange?: (props: OnRefreshChangeProps) => void;
    showUpdateButton?: boolean;
  };
  export const EuiSuperDatePicker: React.SFC<EuiSuperDatePickerProps>;
}

const APM_DEFAULT_TIME_OPTIONS: DatePickerParams = {
  rangeFrom: 'now-24h',
  rangeTo: 'now',
  refreshPaused: true,
  refreshInterval: 0
};

function toBoolean(value?: string | boolean) {
  if (value === 'true' || value === true) {
    return true;
  }
  if (value === 'false' || value === false) {
    return false;
  }
}

class DatePickerComponent extends React.Component<Props> {
  public refreshTimeoutId = 0;

  public getParamsFromSearch = memoize((search: string) => {
    const query = toQuery(search);
    if ('refreshPaused' in query) {
      query.refreshPaused = toBoolean(query.refreshPaused);
    }
    if ('refreshInterval' in query) {
      query.refreshInterval = toNumber(query.refreshInterval);
    }
    return {
      ...APM_DEFAULT_TIME_OPTIONS,
      ...query
    } as DatePickerParams;
  });

  public componentDidMount() {
    this.dispatchTimeRangeUpdate();
    this.restartRefreshCycle();
  }

  public componentWillUnmount() {
    this.clearRefreshTimeout();
  }

  public componentDidUpdate(prevProps: Props) {
    const currentParams = this.getParamsFromSearch(this.props.location.search);
    const previousParams = this.getParamsFromSearch(prevProps.location.search);
    if (
      currentParams.rangeFrom !== previousParams.rangeFrom ||
      currentParams.rangeTo !== previousParams.rangeTo
    ) {
      this.dispatchTimeRangeUpdate();
    }

    if (
      currentParams.refreshPaused !== previousParams.refreshPaused ||
      currentParams.refreshInterval !== previousParams.refreshInterval
    ) {
      this.restartRefreshCycle();
    }
  }

  public dispatchTimeRangeUpdate() {
    const { rangeFrom, rangeTo } = this.getParamsFromSearch(
      this.props.location.search
    );
    const parsed = {
      from: datemath.parse(rangeFrom),
      to: datemath.parse(rangeTo)
    };
    if (!parsed.from || !parsed.to) {
      return;
    }
    const min = parsed.from.toISOString();
    const max = parsed.to.toISOString();
    this.props.dispatchUpdateTimePicker({ min, max });
  }

  public clearRefreshTimeout() {
    if (this.refreshTimeoutId) {
      window.clearTimeout(this.refreshTimeoutId);
    }
  }

  public refresh = () => {
    const { refreshPaused, refreshInterval } = this.getParamsFromSearch(
      this.props.location.search
    );

    this.clearRefreshTimeout();

    if (refreshPaused) {
      return;
    }

    this.dispatchTimeRangeUpdate();
    this.refreshTimeoutId = window.setTimeout(this.refresh, refreshInterval);
  };

  public restartRefreshCycle = () => {
    this.clearRefreshTimeout();
    const { refreshInterval, refreshPaused } = this.getParamsFromSearch(
      this.props.location.search
    );
    if (refreshPaused) {
      return;
    }
    this.refreshTimeoutId = window.setTimeout(this.refresh, refreshInterval);
  };

  public updateUrl(nextSearch: {
    rangeFrom?: string;
    rangeTo?: string;
    refreshPaused?: boolean;
    refreshInterval?: number;
  }) {
    const currentSearch = toQuery(this.props.location.search);

    this.props.history.replace({
      ...this.props.location,
      search: fromQuery({
        ...currentSearch,
        ...nextSearch
      })
    });
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

  public handleTimeChange: EuiSuperDatePickerProps['onTimeChange'] = options => {
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
        onRefreshChange={this.handleRefreshChange}
        showUpdateButton={false}
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
