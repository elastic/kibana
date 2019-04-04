/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Component } from 'react';
import { EuiPage, EuiPageBody } from '@elastic/eui';
import { getClusters } from './store/selectors';
import { fetchClusters } from './store/actions';
import { connect } from 'react-redux';
import { MonitoringRouter } from './router';
import { HashRouter } from 'react-router-dom';

class MonitoringAppComponent extends Component {
  componentWillMount() {
    this.props.dispatchFetchClusters();
  }

  shouldComponentUpdate(nextProps) {
    if (nextProps.clusters && !this.props.clusters) {
      return true;
    }
    if (nextProps.clusters && this.props.clusters && nextProps.clusters.length !== this.props.clusters.length) {
      return true;
    }
    return false;
  }

  render() {
    const { clusters } = this.props;

    // TODO: show loading UI if no clusters yet
    if (!clusters) {
      return null;
    }

    return (
      <EuiPage className="monitoringApp">
        <EuiPageBody>
          <HashRouter>
            <MonitoringRouter clusters={clusters}/>
          </HashRouter>
        </EuiPageBody>
      </EuiPage>
    );
  }
}

export const MonitoringApp = connect(
  state => ({
    clusters: getClusters(state)
  }),
  {
    dispatchFetchClusters: fetchClusters,
  }
)(MonitoringAppComponent);

