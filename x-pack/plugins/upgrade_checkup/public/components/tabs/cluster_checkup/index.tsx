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
  EuiLoadingSpinner,
  EuiSpacer,
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
  }

  public async componentWillMount() {
    try {
      const resp = await axios.get(chrome.addBasePath('/api/upgrade_checkup/status'));
      this.setState({ loadingState: LoadingState.Success, checkupData: resp.data });
    } catch (e) {
      this.setState({ loadingState: LoadingState.Error });
    }
  }

  public render() {
    return (
      <Fragment>
        <EuiSpacer />
        <EuiTitle>
          <h3>Cluster Checkup</h3>
        </EuiTitle>
        <EuiSpacer />
        {this.renderCheckupData()}
      </Fragment>
    );
  }

  private renderCheckupData() {
    const { loadingState, checkupData } = this.state;
    switch (loadingState) {
      case LoadingState.Loading:
        return <EuiLoadingSpinner />;
      case LoadingState.Error:
        return <h2>Something went wrong!</h2>;
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
