/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { isEqual } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'redux';

import { TlsEdges, TlsSortField, TlsFields } from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, LoadMoreTable, SortingBasicTable } from '../../../load_more_table';
import { getTlsColumns } from './columns';
import * as i18n from './translations';

const tableType = networkModel.NetworkTableType.tls;

interface OwnProps {
  data: TlsEdges[];
  loading: boolean;
  totalCount: number;
  loadMore: (newActivePage: number) => void;
  type: networkModel.NetworkType;
}

interface TlsTableReduxProps {
  tlsSortField: TlsSortField;
  limit: number;
}

interface TlsTableDispatchProps {
  updateTableActivePage: ActionCreator<{
    activePage: number;
    networkType: networkModel.NetworkType;
    tableType: networkModel.NetworkTableType;
  }>;
  updateTlsLimit: ActionCreator<{
    limit: number;
    networkType: networkModel.NetworkType;
  }>;
  updateTlsSort: ActionCreator<{
    tlsSort: TlsSortField;
    networkType: networkModel.NetworkType;
  }>;
}

type TlsTableProps = OwnProps & TlsTableReduxProps & TlsTableDispatchProps;

const rowItems: ItemsPerRow[] = [
  {
    text: i18n.ROWS_5,
    numberOfRow: 5,
  },
  {
    text: i18n.ROWS_10,
    numberOfRow: 10,
  },
  {
    text: i18n.ROWS_20,
    numberOfRow: 20,
  },
  {
    text: i18n.ROWS_50,
    numberOfRow: 50,
  },
];

export const tlsTableId = 'tls-table';

class TlsTableComponent extends React.PureComponent<TlsTableProps> {
  public render() {
    const {
      data,
      limit,
      loading,
      loadMore,
      tlsSortField,
      totalCount,
      type,
      updateTableActivePage,
      updateTlsLimit,
    } = this.props;
    return (
      <LoadMoreTable
        columns={getTlsColumns(tlsTableId)}
        headerCount={totalCount}
        headerTitle={i18n.TRANSPORT_LAYER_SECURITY}
        headerUnit={i18n.UNIT(totalCount)}
        itemsPerRow={rowItems}
        limit={limit}
        loading={loading}
        loadingTitle={i18n.TRANSPORT_LAYER_SECURITY}
        loadMore={newActivePage => loadMore(newActivePage)}
        onChange={this.onChange}
        pageOfItems={data}
        sorting={getSortField(tlsSortField)}
        totalCount={totalCount}
        updateActivePage={newPage =>
          updateTableActivePage({
            activePage: newPage,
            networkType: type,
            tableType,
          })
        }
        updateLimitPagination={newLimit => updateTlsLimit({ limit: newLimit, networkType: type })}
      />
    );
  }

  private onChange = (criteria: Criteria) => {
    if (criteria.sort != null) {
      const splitField = criteria.sort.field.split('.');
      const newTlsSort: TlsSortField = {
        field: getSortFromString(splitField[splitField.length - 1]),
        direction: criteria.sort.direction,
      };
      if (!isEqual(newTlsSort, this.props.tlsSortField)) {
        this.props.updateTlsSort({
          tlsSortField: newTlsSort,
          networkType: this.props.type,
        });
      }
    }
  };
}

const makeMapStateToProps = () => {
  const getTlsSelector = networkSelectors.tlsSelector();
  return (state: State) => ({
    ...getTlsSelector(state),
  });
};

export const TlsTable = connect(
  makeMapStateToProps,
  {
    updateTableActivePage: networkActions.updateTableActivePage,
    updateTlsLimit: networkActions.updateTlsLimit,
    updateTlsSort: networkActions.updateTlsSort,
  }
)(TlsTableComponent);

const getSortField = (sortField: TlsSortField): SortingBasicTable => ({
  field: `node.${sortField.field}`,
  direction: sortField.direction,
});

const getSortFromString = (sortField: string): TlsFields => {
  switch (sortField) {
    case '_id':
      return TlsFields._id;
    default:
      return TlsFields._id;
  }
};
