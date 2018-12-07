/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiTab } from '@elastic/eui';
import querystring from 'querystring';
import React from 'react';
import { Link } from 'react-router-dom';
import Url from 'url';

import { SearchScope } from '../../common/types';
import { history } from '../../utils/url';

interface Props {
  query: string;
  scope: SearchScope;
}

export class ScopeTab extends React.PureComponent<Props> {
  public onPageClicked = (page: number) => {
    const { query } = this.props;
    const queries = querystring.parse(history.location.search.replace('?', ''));
    history.push(
      Url.format({
        pathname: '/search',
        query: {
          ...queries,
          q: query,
          p: page + 1,
        },
      })
    );
  };

  public render() {
    const emptyFunction = () => null;
    return (
      <EuiFlexGroup>
        <EuiTab isSelected={this.props.scope !== SearchScope.repository} onClick={emptyFunction}>
          <Link to={`/search?q=${this.props.query}&scope=${SearchScope.symbol}`}>Code</Link>
        </EuiTab>
        <EuiTab isSelected={this.props.scope === SearchScope.repository} onClick={emptyFunction}>
          <Link to={`/search?q=${this.props.query}&scope=${SearchScope.repository}`}>
            Repository
          </Link>
        </EuiTab>
      </EuiFlexGroup>
    );
  }
}
