/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiSelect } from '@elastic/eui';
import theme from '@elastic/eui/dist/eui_theme_light.json';
import React, { ChangeEvent } from 'react';
import styled from 'styled-components';
import { SearchScope } from '../../../model';
import { ReferenceInfo } from '../../../model/commit';
import { MainRouteParams } from '../../common/types';
import { encodeRevisionString } from '../../utils/url';
import { history } from '../../utils/url';
import { Breadcrumb } from './breadcrumb';
import { SearchBar } from './search_bar';

const SelectContainer = styled(EuiFlexItem)`
  margin-right: ${theme.euiSizeS};
`;

interface Props {
  routeParams: MainRouteParams;
  onSearchScopeChanged: (s: SearchScope) => void;
  buttons: React.ReactNode;
  repoScope: string[];
  branches: ReferenceInfo[];
}

export class TopBar extends React.Component<Props, { value: string }> {
  public state = {
    value: 'master',
  };

  public onChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const { resource, org, repo, path = '', pathType } = this.props.routeParams;
    this.setState({
      value: e.target.value,
    });
    const revision = this.props.branches.find(b => b.name === e.target.value)!.commit.id;
    history.push(
      `/${resource}/${org}/${repo}/${pathType}/${encodeRevisionString(revision)}/${path}`
    );
  };

  public render() {
    return (
      <div className="code-top-bar__container">
        <SearchBar
          onSearchScopeChanged={this.props.onSearchScopeChanged}
          repoScope={this.props.repoScope}
        />
        <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
          <EuiFlexItem>
            <EuiFlexGroup gutterSize="none">
              <SelectContainer grow={false} style={{ display: 'none' }}>
                <EuiSelect
                  options={this.props.branches.map(b => ({ value: b.name, text: b.name }))}
                  onChange={this.onChange}
                />
              </SelectContainer>
              <Breadcrumb routeParams={this.props.routeParams} />
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>{this.props.buttons}</EuiFlexItem>
        </EuiFlexGroup>
      </div>
    );
  }
}
