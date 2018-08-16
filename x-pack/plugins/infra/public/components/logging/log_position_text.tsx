/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import classNames from 'classnames';
import * as React from 'react';

import { formatTime } from '../../../common/time';
import { LogEntry } from '../../utils/log_entry';

interface LogPositionTextProps {
  className?: string;
  firstVisibleLogEntry: LogEntry | null;
  lastVisibleLogEntry: LogEntry | null;
}

export class LogPositionText extends React.PureComponent<LogPositionTextProps, {}> {
  public render() {
    const { className, firstVisibleLogEntry, lastVisibleLogEntry } = this.props;

    const classes = classNames('streamPositionText', className);

    return (
      <div className={classes}>
        <span>Showing </span>
        <strong>
          {firstVisibleLogEntry ? formatTime(firstVisibleLogEntry.key.time) : 'unknown'}
        </strong>{' '}
        <EuiIcon type="sortRight" />{' '}
        <strong>
          {lastVisibleLogEntry ? formatTime(lastVisibleLogEntry.key.time) : 'unknown'}
        </strong>
      </div>
    );
  }
}
