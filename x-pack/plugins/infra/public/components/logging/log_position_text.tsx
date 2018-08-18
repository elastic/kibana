/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiIcon } from '@elastic/eui';
import classNames from 'classnames';
import * as React from 'react';

import { formatTime, TimeKey } from '../../../common/time';

interface LogPositionTextProps {
  className?: string;
  firstVisiblePosition: TimeKey | null;
  lastVisiblePosition: TimeKey | null;
}

export class LogPositionText extends React.PureComponent<LogPositionTextProps, {}> {
  public render() {
    const { className, firstVisiblePosition, lastVisiblePosition } = this.props;

    const classes = classNames('streamPositionText', className);

    return (
      <div className={classes}>
        <span>Showing </span>
        <strong>
          {firstVisiblePosition ? formatTime(firstVisiblePosition.time) : 'unknown'}
        </strong>{' '}
        <EuiIcon type="sortRight" />{' '}
        <strong>{lastVisiblePosition ? formatTime(lastVisiblePosition.time) : 'unknown'}</strong>
      </div>
    );
  }
}
