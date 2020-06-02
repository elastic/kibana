/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { RemoteClusterAdd as RemoteClusterAddView } from './remote_cluster_add';

import { isAddingCluster, getAddClusterError } from '../../store/selectors';

import { addCluster, clearAddClusterErrors } from '../../store/actions';

const mapStateToProps = (state) => {
  return {
    isAddingCluster: isAddingCluster(state),
    addClusterError: getAddClusterError(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addCluster: (cluster) => {
      dispatch(addCluster(cluster));
    },
    clearAddClusterErrors: () => {
      dispatch(clearAddClusterErrors());
    },
  };
};

export const RemoteClusterAdd = connect(mapStateToProps, mapDispatchToProps)(RemoteClusterAddView);
