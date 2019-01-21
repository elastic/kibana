/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { DetailPanel as DetailPanelView } from './detail_panel';

import {
  getDetailPanelAutoFollowPattern,
  getDetailPanelAutoFollowPatternName,
  getApiStatus,
  isAutoFollowPatternDetailPanelOpen as isDetailPanelOpen,
} from '../../../../../store/selectors';

import {
  closeAutoFollowPatternDetailPanel as closeDetailPanel,
  editAutoFollowPattern,
} from '../../../../../store/actions';

import {
  SECTIONS
} from '../../../../../constants';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

const mapStateToProps = (state) => {
  return {
    isDetailPanelOpen: isDetailPanelOpen(state),
    autoFollowPattern: getDetailPanelAutoFollowPattern(state),
    autoFollowPatternName: getDetailPanelAutoFollowPatternName(state),
    apiStatus: getApiStatus(scope)(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    closeDetailPanel: () => {
      dispatch(closeDetailPanel());
    },
    editAutoFollowPattern: (name) => {
      dispatch(editAutoFollowPattern(name));
    }
  };
};

export const DetailPanel = connect(
  mapStateToProps,
  mapDispatchToProps
)(DetailPanelView);
