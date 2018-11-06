/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { loadClusters } from '../../../store/actions';

import { ClusterList as ClusterListView } from './cluster_list';

const mapDispatchToProps = (dispatch) => ({
  loadClusters: () => dispatch(loadClusters())
});

export const ClusterList = connect(null, mapDispatchToProps)(ClusterListView);
