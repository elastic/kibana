/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPagination } from '@elastic/eui';
import querystring from 'querystring';
import React from 'react';
import url from 'url';

import { history } from '../../utils/url';

interface Props {
  query: string;
  totalPage: number;
  currentPage: number;
}

export class Pagination extends React.PureComponent<Props> {
  public onPageClicked = (page: number) => {
    const { query } = this.props;
    const queries = querystring.parse(history.location.search.replace('?', ''));
    history.push(
      url.format({
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
    return (
      <EuiFlexGroup gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiPagination
            pageCount={this.props.totalPage}
            activePage={this.props.currentPage}
            onPageClick={this.onPageClicked}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }
}
