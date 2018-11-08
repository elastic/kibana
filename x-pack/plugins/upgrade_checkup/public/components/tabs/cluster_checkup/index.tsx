/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import React, { Fragment } from 'react';

import {
  // @ts-ignore
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiLoadingSpinner,
  EuiSpacer,
  EuiText,
  EuiTitle,
} from '@elastic/eui';

import chrome from 'ui/chrome';

import { UpgradeCheckupStatus } from '../../../../server/lib/es_migration_apis';
import { Deprecations, DeprecationSummary, IndexDeprecations } from './deprecations';

enum LoadingState {
  Loading,
  Success,
  Error,
}

interface ClusterCheckupTabState {
  loadingState: LoadingState;
  checkupData?: UpgradeCheckupStatus;
}

export class ClusterCheckupTab extends React.Component<{}, ClusterCheckupTabState> {
  constructor(props: {}) {
    super(props);

    this.state = {
      loadingState: LoadingState.Loading,
    };

    this.loadData = this.loadData.bind(this);
  }

  public componentWillMount() {
    return this.loadData();
  }

  public render() {
    const { loadingState } = this.state;

    return (
      <Fragment>
        <EuiSpacer />
        <EuiTitle>
          <h3>Cluster Checkup</h3>
        </EuiTitle>
        <EuiSpacer />
        <EuiText>
          <p>
            This tool runs a series of checks against your Elasticsearch cluster, nodes, and indices
            to determine whether you can upgrade directly to Elasticsearch version 7, or whether you
            need to make changes to your data before doing so.
          </p>
          <p>
            You will also see deprecated cluster settings and node settings, deprecated plugins, and
            indices with deprecated mappings currently in use.
          </p>
        </EuiText>
        <EuiSpacer />
        <EuiButton
          onClick={this.loadData}
          iconType="refresh"
          isLoading={loadingState === LoadingState.Loading}
        >
          {loadingState === LoadingState.Loading ? 'Loading…' : 'Rerun Checkup'}
        </EuiButton>
        <EuiSpacer />
        {this.renderCheckupData()}
      </Fragment>
    );
  }

  private async loadData() {
    try {
      this.setState({ loadingState: LoadingState.Loading });
      const resp = await axios.get(chrome.addBasePath('/api/upgrade_checkup/status'));
      this.setState({ loadingState: LoadingState.Success, checkupData: resp.data });
    } catch (e) {
      // TODO: show error message?
      this.setState({ loadingState: LoadingState.Error });
    }
  }

  private renderCheckupData() {
    const { loadingState, checkupData } = this.state;
    switch (loadingState) {
      case LoadingState.Loading:
        return <EuiLoadingSpinner />;
      case LoadingState.Error:
        return (
          <EuiCallOut title="Sorry, there was an error" color="danger" iconType="cross">
            <p>There was a network error retrieving the checkup results.</p>
          </EuiCallOut>
        );
      case LoadingState.Success:
        break;
    }

    const { cluster, indices, nodes } = checkupData!;
    const allIndexDeps = Object.values(indices)
      .map(i => i.deprecations)
      .flat();

    return (
      <div>
        <EuiAccordion
          id="indexSettings"
          buttonContent="Indices"
          extraAction={<DeprecationSummary deprecations={allIndexDeps} />}
        >
          <EuiSpacer />
          <IndexDeprecations indices={indices} />
        </EuiAccordion>
        <EuiSpacer />
        <EuiAccordion
          id="nodeSettings"
          buttonContent="Nodes"
          extraAction={<DeprecationSummary deprecations={nodes.deprecations} />}
        >
          <EuiSpacer />
          <Deprecations
            deprecations={nodes.deprecations}
            emptyMessage="No node setting deprecations."
          />
        </EuiAccordion>
        <EuiSpacer />
        <EuiAccordion
          id="clusterSettings"
          buttonContent="Cluster"
          extraAction={<DeprecationSummary deprecations={cluster.deprecations} />}
        >
          <EuiSpacer />
          <Deprecations
            deprecations={cluster.deprecations}
            emptyMessage="No cluster setting deprecations."
          />
        </EuiAccordion>
      </div>
    );
  }
}
