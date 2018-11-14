/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import {
  getPageOfClusters,
  isLoading,
  clusterLoadError
} from '../../store/selectors';

import {
  loadClusters,
  refreshClusters,
  // openDetailPanel,
  // closeDetailPanel,
} from '../../store/actions';

import { RemoteClusterList as RemoteClusterListView } from './remote_cluster_list';

const mapStateToProps = (state) => {
  return {
    clusters: getPageOfClusters(state),
    isLoading: isLoading(state),
    clusterLoadError: clusterLoadError(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    loadClusters: () => {
      dispatch(loadClusters());
    },
    refreshClusters: () => {
      dispatch(refreshClusters());
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

