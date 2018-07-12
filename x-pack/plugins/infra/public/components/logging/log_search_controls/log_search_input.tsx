/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFieldSearch } from '@elastic/eui';
import classNames from 'classnames';
import * as React from 'react';
import styled from 'styled-components';

interface LogSearchInputProps {
  className?: string;
  isLoading: boolean;
  onSearch: (query: string) => void;
  onClear: () => void;
}

interface LogSearchInputState {
  query: string;
}

export class LogSearchInput extends React.PureComponent<LogSearchInputProps, LogSearchInputState> {
  public readonly state = {
    query: '',
  };

  public handleSubmit: React.FormEventHandler<HTMLFormElement> = evt => {
    evt.preventDefault();

    const { query } = this.state;

    if (query === '') {
      this.props.onClear();
    } else {
      this.props.onSearch(this.state.query);
    }
  };

  public handleChangeQuery: React.ChangeEventHandler<HTMLInputElement> = evt => {
    this.setState({
      query: evt.target.value,
    });
  };

  public render() {
    const { className, isLoading } = this.props;
    const { query } = this.state;

    const classes = classNames('loggingSearchInput', className);

    return (
      <form onSubmit={this.handleSubmit}>
        <PlainSearchField
          aria-label="search"
          className={classes}
          fullWidth
          isLoading={isLoading}
          onChange={this.handleChangeQuery}
          placeholder="Search"
          value={query}
        />
      </form>
    );
  }
}

const PlainSearchField = styled(EuiFieldSearch)`
  background: transparent;
  box-shadow: none;

  &:focus {
    box-shadow: inset 0 -2px 0 0 ${props => props.theme.eui.euiColorPrimary};
  }
`;
