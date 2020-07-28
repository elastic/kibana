/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';
import { DetailPanel as PresentationComponent } from './detail_panel';
import {
  getDetailPanelType,
  getDetailPanelIndexName,
  getIndexByIndexName,
} from '../../../../store/selectors';
import {
  openDetailPanel,
  closeDetailPanel,
  clearCacheIndices,
  closeIndices,
  deleteIndices,
  flushIndices,
  forcemergeIndices,
  openIndices,
  refreshIndices,
} from '../../../../store/actions';

const mapStateToProps = (state) => {
  const indexName = getDetailPanelIndexName(state);
  return {
    panelType: getDetailPanelType(state),
    indexName,
    index: getIndexByIndexName(state, indexName),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    clearCacheIndex: (indexName) => {
      dispatch(clearCacheIndices({ indexNames: [indexName] }));
    },
    closeIndex: (indexName) => {
      dispatch(closeIndices({ indexNames: [indexName] }));
    },
    flushIndex: (indexName) => {
      dispatch(flushIndices({ indexNames: [indexName] }));
    },
    openIndex: (indexName) => {
      dispatch(openIndices({ indexNames: [indexName] }));
    },
    refreshIndex: (indexName) => {
      dispatch(refreshIndices({ indexNames: [indexName] }));
    },
    forcemergeIndex: (indexName) => {
      dispatch(forcemergeIndices({ indexNames: [indexName] }));
    },
    deleteIndex: (indexName) => {
      dispatch(deleteIndices({ indexNames: [indexName] }));
    },
    closeDetailPanel: () => dispatch(closeDetailPanel()),
    openDetailPanel: (indexName, panelType) => dispatch(openDetailPanel(indexName, panelType)),
  };
};

export const DetailPanel = connect(mapStateToProps, mapDispatchToProps)(PresentationComponent);
