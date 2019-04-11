/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiTab, EuiTabs } from '@elastic/eui';
import querystring from 'querystring';
import React from 'react';
import styled from 'styled-components';
import url from 'url';

import { SearchScope } from '../../../model';
import { history } from '../../utils/url';

const ScopeTabContainer = styled.div`
  height: 56px;
`;

const ScopeTab = styled(EuiTab)`
  width: 50%;
`;

interface Props {
  query: string;
  scope: SearchScope;
}

export class ScopeTabs extends React.PureComponent<Props> {
  public onTabClicked = (scope: SearchScope) => {
    return () => {
      const { query } = this.props;
      const queries = querystring.parse(history.location.search.replace('?', ''));
      history.push(
        url.format({
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
      <ScopeTabContainer>
        <EuiTabs style={{ height: '100%' }}>
          <ScopeTab
            isSelected={this.props.scope !== SearchScope.REPOSITORY}
            onClick={this.onTabClicked(SearchScope.DEFAULT)}
          >
            Code
          </ScopeTab>
          <ScopeTab
            isSelected={this.props.scope === SearchScope.REPOSITORY}
            onClick={this.onTabClicked(SearchScope.REPOSITORY)}
          >
            Repository
          </ScopeTab>
        </EuiTabs>
      </ScopeTabContainer>
    );
  }
}
