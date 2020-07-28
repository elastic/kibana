/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../../constants';
import {
  getListFollowerIndices,
  getSelectedFollowerIndexId,
  getApiStatus,
  getApiError,
  isApiAuthorized,
} from '../../../store/selectors';
import { loadFollowerIndices, selectDetailFollowerIndex } from '../../../store/actions';
import { FollowerIndicesList as FollowerIndicesListView } from './follower_indices_list';

const scope = SECTIONS.FOLLOWER_INDEX;

const mapStateToProps = (state) => ({
  followerIndices: getListFollowerIndices(state),
  followerIndexId: getSelectedFollowerIndexId('detail')(state),
  apiStatus: getApiStatus(scope)(state),
  apiError: getApiError(scope)(state),
  isAuthorized: isApiAuthorized(scope)(state),
});

const mapDispatchToProps = (dispatch) => ({
  loadFollowerIndices: (inBackground) => dispatch(loadFollowerIndices(inBackground)),
  selectFollowerIndex: (id) => dispatch(selectDetailFollowerIndex(id)),
});

export const FollowerIndicesList = connect(
  mapStateToProps,
  mapDispatchToProps
)(FollowerIndicesListView);
