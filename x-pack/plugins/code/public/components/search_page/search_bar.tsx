/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import querystring from 'querystring';
import React from 'react';
import url from 'url';

import { SearchScope } from '../../../model';
import { SearchScopeText } from '../../common/types';
import { history } from '../../utils/url';
import { Shortcut } from '../shortcuts';

import {
  AutocompleteSuggestion,
  FileSuggestionsProvider,
  QueryBar,
  RepositorySuggestionsProvider,
  SymbolSuggestionsProvider,
} from '../query_bar';

interface Props {
  query: string;
  onSearchScopeChanged: (s: SearchScope) => void;
  repoScope: string[];
}

export class SearchBar extends React.PureComponent<Props> {
  public queryBar: any = null;

  public onSearchChanged = (query: string) => {
    // Update the url and push to history as well.
    const queries = querystring.parse(history.location.search.replace('?', ''));
    history.push(
      url.format({
        pathname: '/search',
        query: {
          ...queries,
          q: query,
          repoScope: this.props.repoScope,
        },
      })
    );
  };

  public toggleOptionsFlyout() {
    if (this.queryBar) {
      this.queryBar.toggleOptionsFlyout();
    }
  }

  public render() {
    const onSubmit = (q: string) => {
      this.onSearchChanged(q);
    };

    const onSelect = (item: AutocompleteSuggestion) => {
      history.push(item.selectUrl);
    };

    const suggestionProviders = [
      new SymbolSuggestionsProvider(),
      new FileSuggestionsProvider(),
      new RepositorySuggestionsProvider(),
    ];

    return (
      <div className="codeSearchbar__container">
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
          query={this.props.query}
          onSubmit={onSubmit}
          onSelect={onSelect}
          appName="code"
          suggestionProviders={suggestionProviders}
          onSearchScopeChanged={this.props.onSearchScopeChanged}
          enableSubmitWhenOptionsChanged={true}
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
