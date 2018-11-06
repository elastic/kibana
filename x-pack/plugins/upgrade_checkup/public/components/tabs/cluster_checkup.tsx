/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import axios from 'axios';
import React, { Fragment } from 'react';

import { EuiLoadingSpinner, EuiSpacer, EuiTitle } from '@elastic/eui';

import chrome from 'ui/chrome';

enum LoadingState {
  Loading,
  Success,
  Error,
}

export class ClusterCheckupTab extends React.Component {
  public state = {
    loadingState: LoadingState.Loading,
    checkupData: null,
  };

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
        return JSON.stringify(checkupData);
    }
  }
}
