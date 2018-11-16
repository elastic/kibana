/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { RemoteClusterEdit as RemoteClusterEditView } from './remote_cluster_edit';

import {
  isLoading,
  getEditedCluster,
//   isUpdatingRemoteCluster,
//   getUpdateRemoteClusterError,
} from '../../store/selectors';

import {
  startEditingCluster,
//   updateRemoteCluster,
//   clearUpdateRemoteClusterErrors,
} from '../../store/actions';

const mapStateToProps = (state) => {
  return {
    isLoading: isLoading(state),
    cluster: getEditedCluster(state),
    // isUpdatingRemoteCluster: isUpdatingRemoteCluster(state),
    // updateRemoteClusterError: getUpdateRemoteClusterError(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    startEditingCluster: (clusterName) => {
      dispatch(startEditingCluster({ clusterName }));
    },
    stopEditingCluster: () => {

    },
    updateRemoteCluster: (/*remoteClusterConfig*/) => {
      // dispatch(updateRemoteCluster(remoteClusterConfig));
    },
    clearUpdateRemoteClusterErrors: () => {
      // dispatch(clearUpdateRemoteClusterErrors());
    },
  };
};

export const RemoteClusterEdit = connect(mapStateToProps, mapDispatchToProps)(RemoteClusterEditView);
