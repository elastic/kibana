/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { isEqual } from 'lodash/fp';
import React from 'react';
import { connect } from 'react-redux';
import { ActionCreator } from 'redux';

import { TlsEdges, TlsSortField, TlsFields } from '../../../../graphql/types';
import { networkActions, networkModel, networkSelectors, State } from '../../../../store';
import { Criteria, ItemsPerRow, LoadMoreTable, SortingBasicTable } from '../../../load_more_table';
import { CountBadge } from '../../index';
import { getTlsColumns } from './columns';
import * as i18n from './translations';

interface OwnProps {
  data: TlsEdges[];
  loading: boolean;
  hasNextPage: boolean;
  nextCursor: string;
  totalCount: number;
  loadMore: (cursor: string) => void;
  type: networkModel.NetworkType;
}

interface TlsTableReduxProps {
  tlsSortField: TlsSortField;
  limit: number;
}

interface TlsTableDispatchProps {
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
      tlsSortField,
      hasNextPage,
      limit,
      loading,
      loadMore,
      totalCount,
      nextCursor,
      updateTlsLimit,
      type,
    } = this.props;

    console.log('Here I am about to call loadMoreTable with tlsSortField:', tlsSortField);
    return (
      <LoadMoreTable
        columns={getTlsColumns(tlsTableId)}
        loadingTitle={i18n.TRANSPORT_LAYER_SECURITY}
        loading={loading}
        pageOfItems={data}
        loadMore={() => loadMore(nextCursor)}
        limit={limit}
        hasNextPage={hasNextPage}
        itemsPerRow={rowItems}
        onChange={this.onChange}
        sorting={getSortField(tlsSortField)}
        updateLimitPagination={newLimit => updateTlsLimit({ limit: newLimit, networkType: type })}
        title={
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <h3>
                {i18n.TRANSPORT_LAYER_SECURITY}
                <CountBadge color="hollow">{totalCount}</CountBadge>
              </h3>
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      />
    );
  }

  private onChange = (criteria: Criteria) => {
    console.log('I am in onChange');
    if (criteria.sort != null) {
      const splitField = criteria.sort.field.split('.');
      const newTlsSort: TlsSortField = {
        field: getSortFromString(splitField[splitField.length - 1]),
        direction: criteria.sort.direction,
      };
      console.log('I have newTlsSort and tlsSortField of:', newTlsSort, this.props.tlsSortField);
      if (!isEqual(newTlsSort, this.props.tlsSortField)) {
        console.log('They are not equal, updating my tlsSort', newTlsSort);
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
  const mapStateToProps = (state: State) => ({
    ...getTlsSelector(state),
  });
  return mapStateToProps;
};

export const TlsTable = connect(
  makeMapStateToProps,
  {
    updateTlsLimit: networkActions.updateTlsLimit,
    updateTlsSort: networkActions.updateTlsSort,
  }
)(TlsTableComponent);

const getSortField = (sortField: TlsSortField): SortingBasicTable => {
  console.log('I am in getSortField with param:', sortField);
  const obj = {
    field: `node.${sortField.field}`,
    direction: sortField.direction,
  };
  console.log('I am in getSortField returning:', obj);
  return obj;
};

const getSortFromString = (sortField: string): TlsFields => {
  console.log('I am in getSortFromString with sortField', sortField);
  switch (sortField) {
    case TlsFields.issuer.valueOf():
      return TlsFields.issuer;
    case TlsFields.subject.valueOf():
      return TlsFields.subject;
    case TlsFields.sha1.valueOf():
      return TlsFields.sha1;
    case TlsFields.ja3.valueOf():
      return TlsFields.ja3;
    default:
      return TlsFields.issuer;
  }
};
