/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

// import {
//   getPageOfRemoteClusters,
//   isLoading
// } from '../../store/selectors';

// import {
//   loadRemoteClusters,
//   refreshRemoteClusters,
//   openDetailPanel,
//   closeDetailPanel,
// } from '../../store/actions';

import { RemoteClusterList as RemoteClusterListView } from './remote_cluster_list';

const mapStateToProps = (/*state*/) => {
  return {
    remoteClusters: [], //getPageOfRemoteClusters(state),
    // isLoading: isLoading(state),
  };
};

const mapDispatchToProps = (/*dispatch*/) => {
  return {
    loadRemoteClusters: () => {
      // dispatch(loadRemoteClusters());
    },
    refreshRemoteClusters: () => {
      // dispatch(refreshRemoteClusters());
    },
    openDetailPanel: (/*remoteClusterId*/) => {
      // dispatch(openDetailPanel({ remoteClusterId }));
    },
    closeDetailPanel: () => {
      // dispatch(closeDetailPanel());
    },
  };
};

export const RemoteClusterList = connect(mapStateToProps, mapDispatchToProps)(RemoteClusterListView);

