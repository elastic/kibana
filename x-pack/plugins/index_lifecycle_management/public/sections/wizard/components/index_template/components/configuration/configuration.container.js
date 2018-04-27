/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */




import { connect } from 'react-redux';
import { Configuration as PresentationComponent } from './configuration';
import {
  getNodeOptions,
  getSelectedPrimaryShardCount,
  getSelectedReplicaCount,
  getSelectedNodeAttrs,
  getIsPrimaryShardCountHigherThanSelectedNodeAttrsCount,
} from '../../../../../../store/selectors';
import {
  setSelectedNodeAttrs,
  setSelectedPrimaryShardCount,
  setSelectedReplicaCount,
  fetchNodes
} from '../../../../../../store/actions';

export const Configuration = connect(
  state => ({
    nodeOptions: getNodeOptions(state),
    selectedNodeAttrs: getSelectedNodeAttrs(state),
    selectedPrimaryShardCount: getSelectedPrimaryShardCount(state),
    selectedReplicaCount: getSelectedReplicaCount(state),
    selectedNodeAttrs: getSelectedNodeAttrs(state),
    isPrimaryShardCountHigherThanSelectedNodeAttrsCount: getIsPrimaryShardCountHigherThanSelectedNodeAttrsCount(state),
  }),
  {
    setSelectedNodeAttrs,
    setSelectedPrimaryShardCount,
    setSelectedReplicaCount,
    fetchNodes
  }
)(PresentationComponent);
