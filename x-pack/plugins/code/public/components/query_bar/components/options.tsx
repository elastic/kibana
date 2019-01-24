/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { EuiIcon } from '@elastic/eui';
import { unique } from 'lodash';
import React, { Component } from 'react';
import styled from 'styled-components';
import { SearchOptions as ISearchOptions } from '../../../actions';

const SelectedRepo = styled.div`
  max-width: 60%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
`;

const Icon = styled(EuiIcon)`
  cursor: pointer;
`;

interface State {
  isFlyoutOpen: boolean;
  repoScopes: any[];
}

interface Props {
  repositorySearch: (p: { query: string }) => void;
  saveSearchOptions: (searchOptions: ISearchOptions) => void;
  repoSearchResults: any[];
  searchLoading: boolean;
  searchOptions: ISearchOptions;
}

export class SearchOptions extends Component<Props, State> {
  public state: State = {
    isFlyoutOpen: false,
    repoScopes: this.props.searchOptions.repoScopes,
  };

  public applyAndClose = () => {
    this.props.saveSearchOptions({ repoScopes: this.state.repoScopes });
    this.setState({ isFlyoutOpen: false });
  };

  public removeRepoScope = (r: string) => () => {
    this.setState(prevState => ({
      repoScopes: prevState.repoScopes.filter(rs => rs !== r),
    }));
  };

  public render() {
    let optionsFlyout;
    if (this.state.isFlyoutOpen) {
      const selectedRepos = this.state.repoScopes.map((r: string) => {
        return (
          <div key={r}>
            <EuiPanel paddingSize="s">
              <EuiFlexGroup gutterSize="none" justifyContent="spaceBetween">
                <SelectedRepo>{r}</SelectedRepo>
                <Icon type="cross" onClick={this.removeRepoScope(r)} />
              </EuiFlexGroup>
            </EuiPanel>
            <EuiSpacer size="s" />
          </div>
        );
      });

      optionsFlyout = (
        <EuiFlyout onClose={this.closeOptionsFlyout} size="s" aria-labelledby="flyoutSmallTitle">
          <EuiFlyoutHeader>
            <EuiTitle size="s">
              <h2 id="flyoutSmallTitle"> Search Settings </h2>
            </EuiTitle>
          </EuiFlyoutHeader>
          <EuiFlyoutBody>
            <EuiTitle size="xs">
              <h3>Repo Scope</h3>
            </EuiTitle>
            <EuiText size="xs">Add indexed repos to your search scope</EuiText>
            <EuiSpacer size="m" />
            <EuiComboBox
              placeholder="Search to add repos"
              async={true}
              options={this.props.repoSearchResults.map(repo => ({
                id: repo.name,
                label: repo.name,
                uri: repo.uri,
              }))}
              selectedOptions={[]}
              isLoading={this.props.searchLoading}
              onChange={this.onRepoChange}
              onSearchChange={this.onRepoSearchChange}
              isClearable={true}
            />
            <EuiSpacer size="m" />
            {selectedRepos}
            <EuiSpacer size="s" />
            <EuiFlexGroup justifyContent="flexEnd" gutterSize="none">
              <EuiButton onClick={this.applyAndClose} fill={true} iconSide="right">
                Apply and Close
              </EuiButton>
            </EuiFlexGroup>
          </EuiFlyoutBody>
        </EuiFlyout>
      );
    }

    return (
      <div>
        <div className="kuiLocalSearchAssistedInput__assistance">
          <EuiButtonEmpty size="xs" onClick={this.toggleOptionsFlyout}>
            Options
          </EuiButtonEmpty>
        </div>
        {optionsFlyout}
      </div>
    );
  }

  private onRepoSearchChange = (searchValue: string) => {
    this.props.repositorySearch({ query: searchValue });
  };

  private onRepoChange = (repos: any) => {
    this.setState({
      repoScopes: unique(repos.map((r: any) => r.uri)),
    });
  };

  private toggleOptionsFlyout = () => {
    this.setState({
      isFlyoutOpen: !this.state.isFlyoutOpen,
    });
  };

  private closeOptionsFlyout = () => {
    this.setState({
      isFlyoutOpen: false,
    });
  };
}
