/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import styled from 'styled-components';

import { SearchScope } from '../../../model';
import { MainRouteParams } from '../../common/types';
import { colors } from '../../style/variables';
import { Breadcrumb } from './breadcrumb';
import { SearchBar } from './search_bar';

const TopBarContainer = styled.div`
  --topBarContainerHeight: 40px;
  box-sizing: content-box;
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  padding: 8px;
  height: var(--topBarContainerHeight);
  min-height: var(--topBarContainerHeight);
  border-bottom: 2px solid ${colors.borderGrey};
  nav {
    line-height: var(--topBarContainerHeight);
    a {
      display: inline;
    }
    div {
      vertical-align: baseline;
    }
  }
`;

interface Props {
  routeParams: MainRouteParams;
  onSearchScopeChanged: (s: SearchScope) => void;
}

export class TopBar extends React.Component<Props> {
  public render() {
    return (
      <TopBarContainer>
        <Breadcrumb routeParams={this.props.routeParams} />
        <SearchBar onSearchScopeChanged={this.props.onSearchScopeChanged} />
      </TopBarContainer>
    );
  }
}
