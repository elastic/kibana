/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { connect } from 'react-redux';

// import {
//   getPageOfRemoteClusters,
//   getPager,
//   getFilter,
//   getSortField,
//   isSortAscending,
// } from '../../../store/selectors';

// import {
//   closeDetailPanel,
//   filterChanged,
//   openDetailPanel,
//   pageChanged,
//   pageSizeChanged,
//   sortChanged,
// } from '../../../store/actions';

import { RemoteClusterTable as RemoteClusterTableComponent } from './remote_cluster_table';

const mapStateToProps = (/*state*/) => {
  return {
    // jobs: getPageOfRemoteClusters(state),
    // pager: getPager(state),
    // filter: getFilter(state),
    // sortField: getSortField(state),
    // isSortAscending: isSortAscending(state)
  };
};

const mapDispatchToProps = (/*dispatch*/) => {
  return {
    closeDetailPanel: () => {
      // dispatch(closeDetailPanel());
    },
    filterChanged: (/*filter*/) => {
      // dispatch(filterChanged({ filter }));
    },
    pageChanged: (/*pageNumber*/) => {
      // dispatch(pageChanged({ pageNumber }));
    },
    pageSizeChanged: (/*pageSize*/) => {
      // dispatch(pageSizeChanged({ pageSize }));
    },
    sortChanged: (/*sortField, isSortAscending*/) => {
      // dispatch(sortChanged({ sortField, isSortAscending }));
    },
    openDetailPanel: (/*remoteClusterId*/) => {
      // dispatch(openDetailPanel({ remoteClusterId }));
    },
  };
};

export const RemoteClusterTable = connect(
  mapStateToProps,
  mapDispatchToProps,
)(RemoteClusterTableComponent);
