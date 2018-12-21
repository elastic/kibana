/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { euiBorderColor, euiBorderWidthThin } from '@elastic/eui/dist/eui_theme_light.json';
import querystring from 'querystring';
import React from 'react';
import styled from 'styled-components';
import Url from 'url';

import { history } from '../../utils/url';

import {
  AutocompleteSuggestion,
  FileSuggestionsProvider,
  QueryBar,
  RepositorySuggestionsProvider,
  SymbolSuggestionsProvider,
} from '../query_bar';

const SearchBarContainer = styled(EuiFlexGroup)`
  height: 68px;
  padding: 8px;
  border-bottom: ${euiBorderWidthThin} solid ${euiBorderColor};
`;

interface Props {
  query: string;
}

export class SearchBar extends React.PureComponent<Props> {
  public onSearchChanged = (query: string) => {
    // Update the url and push to history as well.
    const queries = querystring.parse(history.location.search.replace('?', ''));
    history.push(
      Url.format({
        pathname: '/search',
        query: {
          ...queries,
          q: query,
        },
      })
    );
  };

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
      <SearchBarContainer>
        <EuiFlexItem>
          <QueryBar
            query={this.props.query}
            onSubmit={onSubmit}
            onSelect={onSelect}
            appName="code"
            suggestionProviders={suggestionProviders}
          />
        </EuiFlexItem>
      </SearchBarContainer>
    );
  }
}
