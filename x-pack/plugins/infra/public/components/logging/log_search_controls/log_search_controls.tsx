/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import classNames from 'classnames';
import * as React from 'react';

import { LogEntryTime } from '../../../../common/log_entry';
import { LogSearchButtons } from './log_search_buttons';
import { LogSearchInput } from './log_search_input';

interface LogSearchControlsProps {
  className?: string;
  clearSearch: () => any;
  isLoadingSearchResults: boolean;
  previousSearchResult: LogEntryTime | null;
  nextSearchResult: LogEntryTime | null;
  jumpToTarget: (target: LogEntryTime) => any;
  search: (query: string) => any;
}

export class LogSearchControls extends React.PureComponent<LogSearchControlsProps, {}> {
  public render() {
    const {
      className,
      clearSearch,
      isLoadingSearchResults,
      previousSearchResult,
      nextSearchResult,
      jumpToTarget,
      search,
    } = this.props;

    const classes = classNames('searchControls', className);

    return (
      <EuiFlexGroup
        alignItems="center"
        gutterSize="xs"
        justifyContent="flexStart"
        className={classes}
      >
        <EuiFlexItem>
          <LogSearchInput
            isLoading={isLoadingSearchResults}
            onClear={clearSearch}
            onSearch={search}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <LogSearchButtons
            previousSearchResult={previousSearchResult}
            nextSearchResult={nextSearchResult}
            jumpToTarget={jumpToTarget}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
