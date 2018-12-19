/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { DetailPanel as DetailPanelView } from './detail_panel';

import { getSelectedAutoFollowPattern, getApiStatus, } from '../../../../../store/selectors';
import { selectAutoFollowPattern } from '../../../../../store/actions';
import { SECTIONS } from '../../../../../constants';

const scope = SECTIONS.AUTO_FOLLOW_PATTERN;

const mapStateToProps = (state) => ({
  autoFollowPattern: getSelectedAutoFollowPattern(state),
  apiStatus: getApiStatus(scope)(state),
});

const mapDispatchToProps = (dispatch) => ({
  // The actual closing of the panel is done in the <AutoFollowPatternList />
  // component as it listens to the URL query change
  closeDetailPanel: () => dispatch(selectAutoFollowPattern(null)),
});

export const DetailPanel = connect(
  mapStateToProps,
  mapDispatchToProps
)(DetailPanelView);
