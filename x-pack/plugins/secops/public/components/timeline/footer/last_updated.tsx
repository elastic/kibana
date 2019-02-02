/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiToolTip } from '@elastic/eui';
import { FormattedRelative } from '@kbn/i18n/react';
import * as React from 'react';
import { pure } from 'recompose';

import * as i18n from './translations';

interface LastUpdatedAtProps {
  short?: boolean;
  updatedAt: number;
}

interface LastUpdatedAtState {
  date: number;
}

export const Updated = pure<{ date: number; prefix: string; updatedAt: number }>(
  ({ date, prefix, updatedAt }) => (
    <>
      {prefix}
      {
        <FormattedRelative
          data-test-subj="last-updated-at-date"
          key={`formatedRelative-${date}`}
          value={new Date(updatedAt)}
        />
      }
    </>
  )
);

export class LastUpdatedAt extends React.PureComponent<LastUpdatedAtProps, LastUpdatedAtState> {
  public readonly state = {
    date: Date.now(),
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
    const { short = false } = this.props;
    const prefix = ` ${i18n.UPDATED} `;

    return (
      <EuiFlexGroup
        alignItems="center"
        data-test-subj="last-updated-at-container"
        direction="row"
        gutterSize="none"
        justifyContent="flexEnd"
      >
        <EuiFlexItem grow={false}>
          <EuiIcon data-test-subj="last-updated-at-clock-icon" type="clock" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiToolTip
            data-test-subj="timeline-stream-tool-tip"
            content={
              <>
                <Updated date={this.state.date} prefix={prefix} updatedAt={this.props.updatedAt} />
              </>
            }
          >
            <Updated
              date={this.state.date}
              prefix={!short ? prefix : ''}
              updatedAt={this.props.updatedAt}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
