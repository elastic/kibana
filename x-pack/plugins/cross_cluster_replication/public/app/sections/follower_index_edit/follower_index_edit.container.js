/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../constants';
import {
  getApiStatus,
  getApiError,
  getSelectedFollowerIndexId,
  getSelectedFollowerIndex,
} from '../../store/selectors';
import {
  saveFollowerIndex,
  clearApiError,
  getFollowerIndex,
  selectEditFollowerIndex,
} from '../../store/actions';
import { FollowerIndexEdit as FollowerIndexEditView } from './follower_index_edit';

const scope = SECTIONS.FOLLOWER_INDEX;

const mapStateToProps = (state) => ({
  apiStatus: {
    get: getApiStatus(`${scope}-get`)(state),
    save: getApiStatus(`${scope}-save`)(state),
  },
  apiError: {
    get: getApiError(`${scope}-get`)(state),
    save: getApiError(`${scope}-save`)(state),
  },
  followerIndexId: getSelectedFollowerIndexId('edit')(state),
  followerIndex: getSelectedFollowerIndex('edit')(state),
});

const mapDispatchToProps = (dispatch) => ({
  getFollowerIndex: (id) => dispatch(getFollowerIndex(id)),
  selectFollowerIndex: (id) => dispatch(selectEditFollowerIndex(id)),
  saveFollowerIndex: (id, followerIndex) => dispatch(saveFollowerIndex(id, followerIndex, true)),
  clearApiError: () => {
    dispatch(clearApiError(`${scope}-get`));
    dispatch(clearApiError(`${scope}-save`));
  },
});

export const FollowerIndexEdit = connect(
  mapStateToProps,
  mapDispatchToProps
)(FollowerIndexEditView);
