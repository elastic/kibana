/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { DetailPanel as DetailPanelView } from './detail_panel';

import {
  getDetailPanelType,
  getDetailPanelJob,
} from '../../../store/selectors';

import {
  closeDetailPanel,
  openDetailPanel,
} from '../../../store/actions';

const mapStateToProps = (state) => {
  const job = getDetailPanelJob(state);
  return {
    panelType: getDetailPanelType(state),
    job,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    closeDetailPanel: () => {
      dispatch(closeDetailPanel());
    },
    openDetailPanel: ({ panelType, job }) => {
      dispatch(openDetailPanel({ panelType, job }));
    },
  };
};

export const DetailPanel = connect(
  mapStateToProps,
  mapDispatchToProps
)(DetailPanelView);
