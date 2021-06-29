/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';

import { openDetailPanel } from '../../../store/actions';

import { RemoteClusterTable as RemoteClusterTableComponent } from './remote_cluster_table';

const mapDispatchToProps = (dispatch) => {
  return {
    openDetailPanel: (clusterName) => {
      dispatch(openDetailPanel({ name: clusterName }));
    },
  };
};

export const RemoteClusterTable = connect(
  undefined,
  mapDispatchToProps
)(RemoteClusterTableComponent);
