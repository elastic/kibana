/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { MainRouteParams, SearchScope } from '../../common/types';
import { pxToRem } from '../../style/variables';
import {
  AutocompleteSuggestion,
  FileSuggestionsProvider,
  QueryBar,
  RepositorySuggestionsProvider,
  SymbolSuggestionsProvider,
} from '../query_bar';
import { Shortcut } from '../shortcuts';

const SearchBarContainer = styled.div`
  width: ${pxToRem(600)};
`;

export class CodeSearchBar extends React.Component<RouteComponentProps<MainRouteParams>> {
  public state = {
    searchScope: SearchScope.default,
  };

  public suggestionProviders = [
    new SymbolSuggestionsProvider(),
    new FileSuggestionsProvider(),
    new RepositorySuggestionsProvider(),
  ];

  public onSubmit = (query: string) => {
    const { history } = this.props;
    if (query.trim().length === 0) {
      return;
    }
    if (this.state.searchScope === SearchScope.repository) {
      history.push(`/search?q=${query}&scope=${SearchScope.repository}`);
    } else {
      history.push(`/search?q=${query}`);
    }
  };

  public onSelect = (item: AutocompleteSuggestion) => {
    this.props.history.push(item.selectUrl);
  };

  public render() {
    return (
      <SearchBarContainer>
        <Shortcut keyCode="p" help="Search projects" />
        <Shortcut keyCode="y" help="Search symbols" />
        <Shortcut keyCode="s" help="Search everything" />
        <QueryBar
          query=""
          onSubmit={this.onSubmit}
          onSelect={this.onSelect}
          appName="code"
          disableAutoFocus={true}
          suggestionProviders={this.suggestionProviders}
        />
      </SearchBarContainer>
    );
  }
}

export const SearchBar = withRouter(CodeSearchBar);
