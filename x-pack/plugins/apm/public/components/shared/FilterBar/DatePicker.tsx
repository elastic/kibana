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
import React from 'react';
import { connect } from 'react-redux';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import { updateTimePicker } from 'x-pack/plugins/apm/public/store/urlParams';
import {
  fromQuery,
  getQueryWithRisonParams,
  risonSafeDecode,
  toQuery
} from '../Links/url_helpers';

interface Props extends RouteComponentProps {
  dispatchUpdateTimePicker: typeof updateTimePicker;
}

interface State {
  from: string;
  to: string;
  isPaused: boolean;
  refreshInterval: number;
}

interface QueryG {
  time?: {
    from: string;
    to: string;
  };
  refreshInterval?: {
    pause: boolean;
    value: number;
  };
}

// TODO move into EUI as PR
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

const APM_DEFAULT_TIME_RANGE = {
  from: 'now-24h',
  to: 'now'
};

const APM_DEFAULT_REFRESH = {
  pause: true,
  value: 0
};

class DatePickerComponent extends React.Component<Props, State> {
  public state = {
    from: '',
    to: '',
    isPaused: true,
    refreshInterval: 0
  };
  public lastRefresh = 0;
  public nextRefreshRafId = 0;

  public componentDidMount() {
    // read from query string to initialize, or set defaults
    const g = this.getG(this.props.location.search);
    this.updateStateFromUrl(g);
  }

  public componentWillUnmount() {
    cancelAnimationFrame(this.nextRefreshRafId);
  }

  public componentDidUpdate(prevProps: Props) {
    if (prevProps.location.search !== this.props.location.search) {
      // TODO do we need to check for this
      const currentG = this.getG(this.props.location.search);
      const previousG = this.getG(prevProps.location.search);
      if (currentG !== previousG) {
        this.updateStateFromUrl(currentG);
      }
    }
  }

  public getG(search: string) {
    const { _g } = toQuery(search);
    return risonSafeDecode(_g) as QueryG | undefined;
  }

  public refresh = (min: string, max: string) => {
    cancelAnimationFrame(this.nextRefreshRafId);
    const { isPaused, refreshInterval } = this.state;
    const now = new Date().getTime();

    if (isPaused || !refreshInterval) {
      return;
    }
    if (!this.lastRefresh) {
      this.lastRefresh = now;
    }
    if (now - this.lastRefresh >= refreshInterval) {
      this.props.dispatchUpdateTimePicker({ min, max });
      this.lastRefresh = now;
    }
    requestAnimationFrame(() => this.refresh(min, max));
  };

  public updateStateFromUrl(g: QueryG = {}) {
    const { from, to } = g.time || APM_DEFAULT_TIME_RANGE;
    const { pause, value } = g.refreshInterval || APM_DEFAULT_REFRESH;

    const parsed = {
      from: datemath.parse(from),
      to: datemath.parse(to)
    };

    if (!parsed.from || !parsed.to) {
      // set state with these bogus values and let EUI date picker component display error state
      this.setState({ from, to });
      return;
    }

    const min = parsed.from.toISOString();
    const max = parsed.to.toISOString();
    this.props.dispatchUpdateTimePicker({ min, max });
    this.setState({ from, to, isPaused: pause, refreshInterval: value }, () => {
      this.refresh(min, max);
    });
  }

  public updateUrlG(updatedG: QueryG) {
    const currentSearch = toQuery(this.props.location.search);
    const nextSearch = getQueryWithRisonParams(this.props.location, '', {
      _g: updatedG
    });

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
    this.updateUrlG({
      refreshInterval: { pause: isPaused, value: refreshInterval }
    });
  };

  public handleTimeChange: EuiSuperDatePickerProps['onTimeChange'] = options => {
    this.updateUrlG({ time: { from: options.start, to: options.end } });
  };

  public render() {
    if (this.state.from === '' || this.state.to === '') {
      return null;
    }
    return (
      <EuiSuperDatePicker
        start={this.state.from}
        end={this.state.to}
        isPaused={this.state.isPaused}
        refreshInterval={this.state.refreshInterval}
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
