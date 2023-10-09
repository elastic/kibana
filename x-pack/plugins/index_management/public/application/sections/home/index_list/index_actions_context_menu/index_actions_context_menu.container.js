/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { IndexActionsContextMenu as PresentationComponent } from './index_actions_context_menu';
import {
  clearCacheIndices,
  closeIndices,
  deleteIndices,
  flushIndices,
  forcemergeIndices,
  openIndices,
  refreshIndices,
  performExtensionAction,
  reloadIndices,
  unfreezeIndices,
} from '../../../../store/actions';

import { getIndexStatusByIndexName, getIndicesByName } from '../../../../store/selectors';

const mapStateToProps = (state, ownProps) => {
  const indexStatusByName = {};
  const { indexNames } = ownProps;

  indexNames.forEach((indexName) => {
    indexStatusByName[indexName] = getIndexStatusByIndexName(state, indexName);
  });

  return {
    indexStatusByName,
    indices: getIndicesByName(state, indexNames),
  };
};

const mapDispatchToProps = (dispatch, { indexNames }) => {
  return {
    clearCacheIndices: () => {
      dispatch(clearCacheIndices({ indexNames }));
    },
    closeIndices: () => {
      dispatch(closeIndices({ indexNames }));
    },
    flushIndices: () => {
      dispatch(flushIndices({ indexNames }));
    },
    openIndices: () => {
      dispatch(openIndices({ indexNames }));
    },
    refreshIndices: () => {
      dispatch(refreshIndices({ indexNames }));
    },
    unfreezeIndices: () => {
      dispatch(unfreezeIndices({ indexNames }));
    },
    forcemergeIndices: (maxNumSegments) => {
      dispatch(forcemergeIndices({ indexNames, maxNumSegments }));
    },
    deleteIndices: () => {
      dispatch(deleteIndices({ indexNames }));
    },
    reloadIndices: () => {
      dispatch(reloadIndices(indexNames));
    },
    performExtensionAction: (requestMethod, successMessage) => {
      dispatch(performExtensionAction({ requestMethod, successMessage, indexNames }));
    },
  };
};

export const IndexActionsContextMenu = connect(
  mapStateToProps,
  mapDispatchToProps
)(PresentationComponent);
