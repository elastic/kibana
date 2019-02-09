/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React from 'react';
import styled from 'styled-components';
import { SearchScope } from '../../../model';
import { MainRouteParams } from '../../common/types';
import { Breadcrumb } from './breadcrumb';
import { SearchBar } from './search_bar';

const TopBarContainer = styled.div`
  box-sizing: content-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: ${theme.paddingSizes.s};
  min-height: 80px;
  border-bottom: ${theme.euiBorderThick};
  nav {
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
  buttons: React.ReactNode;
}

export class TopBar extends React.Component<Props> {
  public render() {
    return (
      <TopBarContainer>
        <SearchBar onSearchScopeChanged={this.props.onSearchScopeChanged} />
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <Breadcrumb routeParams={this.props.routeParams} />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{this.props.buttons}</EuiFlexItem>
        </EuiFlexGroup>
      </TopBarContainer>
    );
  }
}
