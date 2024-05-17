/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { DetailPanel as DetailPanelView } from './detail_panel';

import { SECTIONS } from '../../../../../constants';
import {
  getApiStatus,
  getSelectedFollowerIndex,
  getSelectedFollowerIndexId,
} from '../../../../../store/selectors';

const scope = SECTIONS.FOLLOWER_INDEX;

const mapStateToProps = (state) => ({
  followerIndexId: getSelectedFollowerIndexId('detail')(state),
  followerIndex: getSelectedFollowerIndex('detail')(state),
  apiStatus: getApiStatus(scope)(state),
});

export const DetailPanel = connect(mapStateToProps)(DetailPanelView);
