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
  isEditingCluster,
  getEditClusterError,
} from '../../store/selectors';

import {
  editCluster,
  startEditingCluster,
  stopEditingCluster,
  clearEditClusterErrors,
  openDetailPanel,
} from '../../store/actions';

const mapStateToProps = state => {
  return {
    isLoading: isLoading(state),
    cluster: getEditedCluster(state),
    isEditingCluster: isEditingCluster(state),
    getEditClusterError: getEditClusterError(state),
  };
};

const mapDispatchToProps = dispatch => {
  return {
    startEditingCluster: clusterName => {
      dispatch(startEditingCluster({ clusterName }));
    },
    stopEditingCluster: () => {
      dispatch(stopEditingCluster());
    },
    editCluster: cluster => {
      dispatch(editCluster(cluster));
    },
    clearEditClusterErrors: () => {
      dispatch(clearEditClusterErrors());
    },
    openDetailPanel: clusterName => {
      dispatch(openDetailPanel({ name: clusterName }));
    },
  };
};

export const RemoteClusterEdit = connect(
  mapStateToProps,
  mapDispatchToProps
)(RemoteClusterEditView);
