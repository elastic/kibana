/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../constants';
import { clearApiError, saveFollowerIndex } from '../../store/actions';
import { getApiError, getApiStatus } from '../../store/selectors';
import { FollowerIndexAdd as FollowerIndexAddView } from './follower_index_add';

const scope = SECTIONS.FOLLOWER_INDEX;

const mapStateToProps = (state) => ({
  apiStatus: getApiStatus(`${scope}-save`)(state),
  apiError: getApiError(`${scope}-save`)(state),
});

const mapDispatchToProps = (dispatch) => ({
  saveFollowerIndex: (id, followerIndex) => dispatch(saveFollowerIndex(id, followerIndex)),
  clearApiError: () => dispatch(clearApiError(`${scope}-save`)),
});

export const FollowerIndexAdd = connect(mapStateToProps, mapDispatchToProps)(FollowerIndexAddView);
