/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon } from '@elastic/eui';
import moment from 'moment';
import * as React from 'react';

interface LastUpdatedAtProps {
  updatedAt: number;
}

interface LastUpdatedAtState {
  date: Date;
}

export class LastUpdatedAt extends React.PureComponent<LastUpdatedAtProps, LastUpdatedAtState> {
  public readonly state = {
    date: new Date(),
  };
  private timerID?: NodeJS.Timeout;

  public componentDidMount() {
    this.timerID = setInterval(() => this.tick(), 1000);
  }

  public componentWillUnmount() {
    clearInterval(this.timerID!);
  }

  public tick() {
    this.setState({
      date: new Date(),
    });
  }

  public render() {
    return (
      <EuiFlexGroup gutterSize="none" alignItems="center" justifyContent="flexEnd" direction="row">
        <EuiFlexItem grow={false}>
          <EuiIcon type="clock" />
        </EuiFlexItem>
        <EuiFlexItem> Updated {moment(this.props.updatedAt).fromNow()}</EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
