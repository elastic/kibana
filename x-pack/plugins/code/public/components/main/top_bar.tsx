/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { SearchScope } from '../../../model';
import { MainRouteParams } from '../../common/types';
import { Breadcrumb } from './breadcrumb';
import { SearchBar } from './search_bar';

interface Props {
  routeParams: MainRouteParams;
  onSearchScopeChanged: (s: SearchScope) => void;
  buttons: React.ReactNode;
}

export class TopBar extends React.Component<Props> {
  public render() {
    return (
      <div className="code-top-bar__container">
        <SearchBar onSearchScopeChanged={this.props.onSearchScopeChanged} />
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            <Breadcrumb routeParams={this.props.routeParams} />
          </EuiFlexItem>
          <EuiFlexItem grow={false} style={{ marginRight: '-.5rem' }}>
            {this.props.buttons}
          </EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
