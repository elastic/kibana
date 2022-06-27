/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connect } from 'react-redux';
import { IndexActionsContextMenu as PresentationComponent } from './index_actions_context_menu';
import { TAB_SETTINGS, TAB_MAPPING, TAB_STATS, TAB_EDIT_SETTINGS } from '../../../../constants';
import {
  clearCacheIndices,
  closeIndices,
  deleteIndices,
  flushIndices,
  forcemergeIndices,
  openIndices,
  editIndexSettings,
  refreshIndices,
  openDetailPanel,
  performExtensionAction,
  reloadIndices,
  unfreezeIndices,
} from '../../../../store/actions';

import {
  getIndexStatusByIndexName,
  getIndicesByName,
  getIsSystemIndexByName,
  hasSystemIndex,
} from '../../../../store/selectors';

const mapStateToProps = (state, ownProps) => {
  const indexStatusByName = {};
  const { indexNames } = ownProps;
  const allIndices = state.indices.byId;

  indexNames.forEach((indexName) => {
    indexStatusByName[indexName] = getIndexStatusByIndexName(state, indexName);
  });

  return {
    indexStatusByName,
    indices: getIndicesByName(state, indexNames),
    isSystemIndexByName: getIsSystemIndexByName(indexNames, allIndices),
    hasSystemIndex: hasSystemIndex(indexNames, allIndices),
  };
};

const mapDispatchToProps = (dispatch, { indexNames }) => {
  return {
    editIndexSettings: () => {
      dispatch(editIndexSettings({ indexName: indexNames[0] }));
    },
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
    showSettings: () => {
      dispatch(openDetailPanel({ indexName: indexNames[0], panelType: TAB_SETTINGS }));
    },
    showMapping: () => {
      dispatch(openDetailPanel({ indexName: indexNames[0], panelType: TAB_MAPPING }));
    },
    showStats: () => {
      dispatch(openDetailPanel({ indexName: indexNames[0], panelType: TAB_STATS }));
    },
    editIndex: () => {
      const indexName = indexNames ? indexNames[0] : null;
      if (indexName) {
        dispatch(openDetailPanel({ indexName, panelType: TAB_EDIT_SETTINGS }));
      }
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
