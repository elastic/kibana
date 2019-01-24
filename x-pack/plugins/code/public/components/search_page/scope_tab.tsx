/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiTab, EuiTabs } from '@elastic/eui';
import querystring from 'querystring';
import React from 'react';
import Url from 'url';

import { SearchScope } from '../../../model';
import { history } from '../../utils/url';

interface Props {
  query: string;
  scope: SearchScope;
}

export class ScopeTab extends React.PureComponent<Props> {
  public onTabClicked = (scope: SearchScope) => {
    return () => {
      const { query } = this.props;
      const queries = querystring.parse(history.location.search.replace('?', ''));
      history.push(
        Url.format({
          pathname: '/search',
          query: {
            ...queries,
            q: query,
            scope,
          },
        })
      );
    };
  };

  public render() {
    return (
      <EuiFlexGroup>
        <EuiTabs>
          <EuiTab
            isSelected={this.props.scope !== SearchScope.REPOSITORY}
            onClick={this.onTabClicked(SearchScope.SYMBOL)}
          >
            Code
          </EuiTab>
          <EuiTab
            isSelected={this.props.scope === SearchScope.REPOSITORY}
            onClick={this.onTabClicked(SearchScope.REPOSITORY)}
          >
            Repository
          </EuiTab>
        </EuiTabs>
      </EuiFlexGroup>
    );
  }
}
