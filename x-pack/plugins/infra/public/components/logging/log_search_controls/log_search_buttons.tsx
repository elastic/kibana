/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButtonEmpty, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import classNames from 'classnames';
import * as React from 'react';

import { LogEntryTime } from '../../../../common/log_entry';

interface LogSearchButtonsProps {
  className?: string;
  jumpToTarget: (target: LogEntryTime) => void;
  previousSearchResult: LogEntryTime | null;
  nextSearchResult: LogEntryTime | null;
}

export class LogSearchButtons extends React.PureComponent<LogSearchButtonsProps, {}> {
  public handleJumpToPreviousSearchResult: React.MouseEventHandler<HTMLButtonElement> = () => {
    const { jumpToTarget, previousSearchResult } = this.props;

    if (previousSearchResult) {
      jumpToTarget(previousSearchResult);
    }
  };

  public handleJumpToNextSearchResult: React.MouseEventHandler<HTMLButtonElement> = () => {
    const { jumpToTarget, nextSearchResult } = this.props;

    if (nextSearchResult) {
      jumpToTarget(nextSearchResult);
    }
  };

  public render() {
    const { className, previousSearchResult, nextSearchResult } = this.props;

    const classes = classNames('searchButtons', className);
    const hasPreviousSearchResult = !!previousSearchResult;
    const hasNextSearchResult = !!nextSearchResult;

    return (
      <EuiFlexGroup className={classes} gutterSize="xs">
        <EuiFlexItem>
          <EuiButtonEmpty
            onClick={this.handleJumpToPreviousSearchResult}
            iconType="arrowLeft"
            iconSide="left"
            isDisabled={!hasPreviousSearchResult}
            size="s"
          >
            <FormattedMessage
              id="xpack.infra.logs.search.previousButtonLabel"
              defaultMessage="Previous"
            />
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiButtonEmpty
            onClick={this.handleJumpToNextSearchResult}
            iconType="arrowRight"
            iconSide="right"
            isDisabled={!hasNextSearchResult}
            size="s"
          >
            <FormattedMessage id="xpack.infra.logs.search.nextButtonLabel" defaultMessage="Next" />
          </EuiButtonEmpty>
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
