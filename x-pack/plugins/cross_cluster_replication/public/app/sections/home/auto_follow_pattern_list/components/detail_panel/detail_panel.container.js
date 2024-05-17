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
  getSelectedAutoFollowPattern,
  getSelectedAutoFollowPatternId,
} from '../../../../../store/selectors';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

const mapStateToProps = (state) => ({
  autoFollowPatternId: getSelectedAutoFollowPatternId('detail')(state),
  autoFollowPattern: getSelectedAutoFollowPattern('detail')(state),
  apiStatus: getApiStatus(scope)(state),
});

export const DetailPanel = connect(mapStateToProps)(DetailPanelView);
