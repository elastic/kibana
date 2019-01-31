/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import * as React from 'react';
import * as i18n from './translations';

interface LastUpdatedAtProps {
  updatedAt: number;
}

interface LastUpdatedAtState {
  date: number;
}

export class LastUpdatedAt extends React.PureComponent<LastUpdatedAtProps, LastUpdatedAtState> {
  public readonly state = {
    date: Date.now(),
    updateInterval: 0,
    update: false,
  };
  private timerID?: NodeJS.Timeout;

  public componentDidMount() {
    this.timerID = setInterval(() => this.tick(), 10000);
  }

  public componentWillUnmount() {
    clearInterval(this.timerID!);
  }

  public tick() {
    this.setState({
      date: Date.now(),
    });
  }

  public render() {
    return (
      <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="flexEnd" direction="row">
        <EuiFlexItem grow={false}>
          <EuiIcon type="clock" />
        </EuiFlexItem>
        <EuiFlexItem>
          {' '}
          {i18n.UPDATED}{' '}
          {
            <FormattedRelative
              key={`FormatedTime-${this.state.date}`}
              value={new Date(this.props.updatedAt)}
            />
          }
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
