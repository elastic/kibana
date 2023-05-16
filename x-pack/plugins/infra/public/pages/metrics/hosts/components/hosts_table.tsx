/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBasicTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { NoData } from '../../../../components/empty_states';
import { HostNodeRow, useHostsTableContext } from '../hooks/use_hosts_table';
import { useHostsViewContext } from '../hooks/use_hosts_view';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import { FlyoutWrapper } from './host_details_flyout/flyout_wrapper';
import { DEFAULT_PAGE_SIZE } from '../constants';

const PAGE_SIZE_OPTIONS = [5, 10, 20];

export const HostsTable = () => {
  const { loading } = useHostsViewContext();
  const { onSubmit } = useUnifiedSearchContext();

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
  } = useHostsTableContext();

  return (
    <>
      <EuiBasicTable
        data-test-subj="hostsView-table"
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
            <NoData
              titleText={i18n.translate('xpack.infra.waffle.noDataTitle', {
                defaultMessage: 'There is no data to display.',
              })}
              bodyText={i18n.translate('xpack.infra.waffle.noDataDescription', {
                defaultMessage: 'Try adjusting your time or filter.',
              })}
              refetchText={i18n.translate('xpack.infra.waffle.checkNewDataButtonLabel', {
                defaultMessage: 'Check for new data',
              })}
              onRefetch={() => onSubmit()}
              testString="noMetricsDataPrompt"
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
