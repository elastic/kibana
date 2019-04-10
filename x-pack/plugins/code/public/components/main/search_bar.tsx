/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ParsedUrlQuery } from 'querystring';
import React from 'react';
import { RouteComponentProps, withRouter } from 'react-router-dom';
import url from 'url';

import { unique } from 'lodash';
import { SearchScope, Repository } from '../../../model';
import { MainRouteParams, SearchScopeText } from '../../common/types';
import {
  AutocompleteSuggestion,
  FileSuggestionsProvider,
  QueryBar,
  RepositorySuggestionsProvider,
  SymbolSuggestionsProvider,
} from '../query_bar';
import { Shortcut } from '../shortcuts';
import { SearchOptions } from '../../actions';

interface Props extends RouteComponentProps<MainRouteParams> {
  onSearchScopeChanged: (s: SearchScope) => void;
  searchOptions: SearchOptions;
  defaultSearchScope?: Repository;
}

export class CodeSearchBar extends React.Component<Props> {
  public state = {
    searchScope: SearchScope.DEFAULT,
  };

  public queryBar: any | null = null;

  public suggestionProviders = [
    new SymbolSuggestionsProvider(),
    new FileSuggestionsProvider(),
    new RepositorySuggestionsProvider(),
  ];

  public onSubmit = (queryString: string) => {
    const { history } = this.props;
    if (queryString.trim().length === 0) {
      return;
    }
    const query: ParsedUrlQuery = {
      q: queryString,
    };
    if (this.props.searchOptions.repoScope) {
      // search from a repo page may have a default scope of this repo
      if (this.props.searchOptions.defaultRepoScopeOn && this.props.defaultSearchScope) {
        query.repoScope = unique([
          ...this.props.searchOptions.repoScope.map(r => r.uri),
          this.props.defaultSearchScope.uri,
        ]).join(',');
      } else {
        query.repoScope = this.props.searchOptions.repoScope.map(r => r.uri).join(',');
      }
    }
    if (this.state.searchScope === SearchScope.REPOSITORY) {
      query.scope = SearchScope.REPOSITORY;
    }
    history.push(url.format({ pathname: '/search', query }));
  };

  public onSelect = (item: AutocompleteSuggestion) => {
    this.props.history.push(item.selectUrl);
  };

  public render() {
    return (
      <div className="codeContainer__searchBar">
        <Shortcut
          keyCode="p"
          help={SearchScopeText[SearchScope.REPOSITORY]}
          onPress={() => {
            this.props.onSearchScopeChanged(SearchScope.REPOSITORY);
            if (this.queryBar) {
              this.queryBar.focusInput();
            }
          }}
        />
        <Shortcut
          keyCode="y"
          help={SearchScopeText[SearchScope.SYMBOL]}
          onPress={() => {
            this.props.onSearchScopeChanged(SearchScope.SYMBOL);
            if (this.queryBar) {
              this.queryBar.focusInput();
            }
          }}
        />
        <Shortcut
          keyCode="s"
          help={SearchScopeText[SearchScope.DEFAULT]}
          onPress={() => {
            this.props.onSearchScopeChanged(SearchScope.DEFAULT);
            if (this.queryBar) {
              this.queryBar.focusInput();
            }
          }}
        />
        <QueryBar
          query=""
          onSubmit={this.onSubmit}
          onSelect={this.onSelect}
          appName="code"
          disableAutoFocus={true}
          suggestionProviders={this.suggestionProviders}
          enableSubmitWhenOptionsChanged={false}
          onSearchScopeChanged={this.props.onSearchScopeChanged}
          ref={instance => {
            if (instance) {
              // @ts-ignore
              this.queryBar = instance.getWrappedInstance();
            }
          }}
        />
      </div>
    );
  }
}

export const SearchBar = withRouter(CodeSearchBar);
