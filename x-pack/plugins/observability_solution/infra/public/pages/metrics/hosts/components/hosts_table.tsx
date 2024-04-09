/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { EuiEmptyPrompt } from '@elastic/eui';
import { HostNodeRow, useHostsTableContext } from '../hooks/use_hosts_table';
import { useHostsViewContext } from '../hooks/use_hosts_view';
import { FlyoutWrapper } from './host_details_flyout/flyout_wrapper';
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from '../constants';
import { FilterAction } from './table/filter_action';

export const HostsTable = () => {
  const { loading } = useHostsViewContext();

  const {
    columns,
    items,
    currentPage,
    isFlyoutOpen,
    closeFlyout,
    clickedItem,
    onTableChange,
    pagination,
    sorting,
    selection,
    selectedItemsCount,
    filterSelectedHosts,
  } = useHostsTableContext();

  return (
    <>
      <FilterAction
        selectedItemsCount={selectedItemsCount}
        filterSelectedHosts={filterSelectedHosts}
      />
      <EuiBasicTable
        data-test-subj={`hostsView-table-${loading ? 'loading' : 'loaded'}`}
        itemId="id"
        selection={selection}
        pagination={{
          pageIndex: pagination.pageIndex ?? 0,
          pageSize: pagination.pageSize ?? DEFAULT_PAGE_SIZE,
          totalItemCount: items.length,
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
        sorting={{
          sort: {
            field: sorting.field as keyof HostNodeRow,
            direction: sorting.direction ?? 'asc',
          },
        }}
        rowProps={{
          'data-test-subj': 'hostsView-tableRow',
        }}
        items={currentPage}
        columns={columns}
        loading={loading}
        onChange={onTableChange}
        noItemsMessage={
          loading ? (
            i18n.translate('xpack.infra.waffle.loadingDataText', {
              defaultMessage: 'Loading data',
            })
          ) : (
            <EuiEmptyPrompt
              body={i18n.translate('xpack.infra.waffle.noDataDescription', {
                defaultMessage: 'Try adjusting your time or filter.',
              })}
              data-test-subj="hostsViewTableNoData"
              layout="vertical"
              title={
                <h2>
                  {i18n.translate('xpack.infra.waffle.noDataTitle', {
                    defaultMessage: 'There is no data to display.',
                  })}
                </h2>
              }
              hasBorder={false}
              titleSize="m"
            />
          )
        }
      />
      {isFlyoutOpen && clickedItem && (
        <FlyoutWrapper node={clickedItem} closeFlyout={closeFlyout} />
      )}
    </>
  );
};
