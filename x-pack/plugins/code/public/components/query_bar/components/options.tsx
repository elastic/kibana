/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  // @ts-ignore
  EuiButtonGroup,
  EuiComboBox,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { Component, Fragment } from 'react';

interface State {
  isFlyoutOpen: boolean;
  repoScopes: any[];
}

interface Props {
  scope: string;
  repoScopesOptions: any[];
  selectedRepoScopes: any[];
}

export class Options extends Component<Props, State> {
  public static defaultProps: Props = {
    scope: 'default',
    repoScopesOptions: [
      {
        id: `default`,
        label: 'Default',
      },
      {
        id: `symbol`,
        label: 'Symbol',
      },
      {
        id: `repository`,
        label: 'Repository',
      },
    ],
    selectedRepoScopes: [
      {
        label: 'Repo 1',
      },
      {
        label: 'Repo 2',
      },
      {
        label: 'Repo 3',
      },
    ],
  };

  public state: State = {
    isFlyoutOpen: false,
    repoScopes: [
      {
        uri: 'Repo 1',
      },
      {
        uri: 'Repo 2',
      },
    ],
  };

  public render() {
    let optionsFlyout;
    if (this.state.isFlyoutOpen) {
      const toggleIdToSelectedMap = {
        [this.props.scope]: true,
      };

      const selectedRepos = this.state.repoScopes.map((r: any) => {
        return (
          <div>
            <EuiPanel paddingSize="s">{r.uri}</EuiPanel>
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
            <Fragment>
              <EuiButtonGroup
                name="Primary"
                options={this.props.repoScopesOptions}
                idToSelectedMap={toggleIdToSelectedMap}
                onChange={this.onScopeChanged}
                color="primary"
              />
              <EuiSpacer size="m" />
              <EuiTitle size="xs">
                <h3>Repo Scope</h3>
              </EuiTitle>
              <EuiText size="xs">Add indexed repos to your search scope</EuiText>
              <EuiSpacer size="m" />
              <EuiComboBox
                placeholder="Search to add repos"
                async={true}
                options={this.props.selectedRepoScopes}
                selectedOptions={[]}
                isLoading={false}
                onChange={this.onRepoChange}
                onSearchChange={this.onRepoSearchChange}
                isClearable={true}
              />
              <EuiSpacer size="m" />
              {selectedRepos}
            </Fragment>
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

  private onScopeChanged = (scopeId: string) => {
    // TODO(mengwei): handle scope id changes and apply to the search query.
  };

  private onRepoSearchChange = () => {
    // TODO(qianliang): implement the data flow.
  };

  private onRepoChange = () => {
    // TODO(qianliang): implement the data flow.
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
