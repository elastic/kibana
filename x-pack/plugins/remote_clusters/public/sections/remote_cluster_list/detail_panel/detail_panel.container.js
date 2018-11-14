/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { DetailPanel as DetailPanelView } from './detail_panel';

import {
  isDetailPanelOpen,
  // getDetailPanelRemoteCluster,
  // getDetailPanelRemoteClusterId,
  // isLoading,
} from '../../../store/selectors';

import {
  closeDetailPanel,
} from '../../../store/actions';

const mapStateToProps = (state) => {
  return {
    isOpen: isDetailPanelOpen(state),
    // isLoading: isLoading(state),
    // remoteCluster: getDetailPanelRemoteCluster(state),
    // remoteClusterName: getDetailPanelRemoteClusterName(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    closeDetailPanel: () => {
      dispatch(closeDetailPanel());
    },
  };
};

export const DetailPanel = connect(
  mapStateToProps,
  mapDispatchToProps
)(DetailPanelView);
