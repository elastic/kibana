/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';

// @ts-ignore
import { EuiSearchBar } from '@elastic/eui';

interface SearchBarProps {
  searchItems: [];
  defaultFields: string[];
  updateOnChange: Function;
}

interface SearchBarState {
  currentResult: {};
}

export class SearchBar extends Component<SearchBarProps, SearchBarState> {
  private defaultOnChange = ({ query }: { query: string }) => {
    const { searchItems, defaultFields, updateOnChange } = this.props;

    const result = EuiSearchBar.Query.execute(query, searchItems, {
      defaultFields,
    });
    this.setState({ currentResult: result });
    updateOnChange({ updatedResult: result });
  };

  public render() {
    return (
      <EuiSearchBar
        defaultQuery={EuiSearchBar.Query.MATCH_ALL}
        box={{
          placeholder: 'try _source.host.ip:"10.11.12.13"',
          incremental: false,
          filters: [],
          'data-test-subj': 'endpointsSearchBar',
        }}
        onChange={this.defaultOnChange}
      />
    );
  }
}
