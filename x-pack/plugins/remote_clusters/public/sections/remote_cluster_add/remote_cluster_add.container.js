/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { RemoteClusterAdd as RemoteClusterAddView } from './remote_cluster_add';

// import {
//   isAddingRemoteCluster,
//   getAddRemoteClusterError,
// } from '../../store/selectors';

// import {
//   addRemoteCluster,
//   clearAddRemoteClusterErrors,
// } from '../../store/actions';

const mapStateToProps = (/*state*/) => {
  return {
    // isAddingRemoteCluster: isAddingRemoteCluster(state),
    // addRemoteClusterError: getAddRemoteClusterError(state),
  };
};

const mapDispatchToProps = (/*dispatch*/) => {
  return {
    addRemoteCluster: (/*remoteClusterConfig*/) => {
      // dispatch(addRemoteCluster(remoteClusterConfig));
    },
    clearAddRemoteClusterErrors: () => {
      // dispatch(clearAddRemoteClusterErrors());
    },
  };
};

export const RemoteClusterAdd = connect(mapStateToProps, mapDispatchToProps)(RemoteClusterAddView);
