/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

import { SECTIONS } from '../../constants';
import {
  getListAutoFollowPatterns,
  getListFollowerIndices,
  isApiAuthorized,
} from '../../store/selectors';
import { CrossClusterReplicationHome as CrossClusterReplicationHomeView } from './home';

const mapStateToProps = (state) => ({
  autoFollowPatterns: getListAutoFollowPatterns(state),
  isAutoFollowApiAuthorized: isApiAuthorized(SECTIONS.AUTO_FOLLOW_PATTERN)(state),
  followerIndices: getListFollowerIndices(state),
  isFollowerIndexApiAuthorized: isApiAuthorized(SECTIONS.FOLLOWER_INDEX)(state),
});

export const CrossClusterReplicationHome = connect(
  mapStateToProps,
  null
)(CrossClusterReplicationHomeView);
