/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import styled from 'styled-components';
import { SearchScope } from '../../../model';
import { MainRouteParams, SearchScopeText } from '../../common/types';
import {
  AutocompleteSuggestion,
  FileSuggestionsProvider,
  QueryBar,
  RepositorySuggestionsProvider,
  SymbolSuggestionsProvider,
} from '../query_bar';
import { Shortcut } from '../shortcuts';

const SearchBarContainer = styled.div`
  width: 100%;
`;

interface Props extends RouteComponentProps<MainRouteParams> {
  onSearchScopeChanged: (s: SearchScope) => void;
  repoScope: string[];
}

export class CodeSearchBar extends React.Component<Props> {
  public state = {
    searchScope: SearchScope.DEFAULT,
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
    let qs = '';
    if (this.props.repoScope) {
      qs = `&repoScope=${this.props.repoScope.join(',')}`;
    }
    if (this.state.searchScope === SearchScope.REPOSITORY) {
      history.push(`/search?q=${query}&scope=${SearchScope.REPOSITORY}${qs}`);
    } else {
      history.push(`/search?q=${query}${qs}`);
    }
  };

  public onSelect = (item: AutocompleteSuggestion) => {
    this.props.history.push(item.selectUrl);
  };

  public render() {
    return (
      <SearchBarContainer>
        <Shortcut
          keyCode="p"
          help={SearchScopeText[SearchScope.REPOSITORY]}
          onPress={() => {
            this.props.onSearchScopeChanged(SearchScope.REPOSITORY);
          }}
        />
        <Shortcut
          keyCode="y"
          help={SearchScopeText[SearchScope.SYMBOL]}
          onPress={() => {
            this.props.onSearchScopeChanged(SearchScope.SYMBOL);
          }}
        />
        <Shortcut
          keyCode="s"
          help={SearchScopeText[SearchScope.DEFAULT]}
          onPress={() => {
            this.props.onSearchScopeChanged(SearchScope.DEFAULT);
          }}
        />
        <QueryBar
          query=""
          onSubmit={this.onSubmit}
          onSelect={this.onSelect}
          appName="code"
          disableAutoFocus={true}
          suggestionProviders={this.suggestionProviders}
          onSearchScopeChanged={this.props.onSearchScopeChanged}
        />
      </SearchBarContainer>
    );
  }
}

export const SearchBar = withRouter(CodeSearchBar);
