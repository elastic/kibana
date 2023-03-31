/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { NoData } from '../../../../components/empty_states';
import { useHostsTable } from '../hooks/use_hosts_table';
import { useHostsViewContext } from '../hooks/use_hosts_view';
import { useUnifiedSearchContext } from '../hooks/use_unified_search';
import { Flyout } from './host_details_flyout/flyout';

export const HostsTable = () => {
  const { hostNodes, loading } = useHostsViewContext();
  const { onSubmit, searchCriteria } = useUnifiedSearchContext();

  const {
    columns,
    items,
    isFlyoutOpen,
    closeFlyout,
    clickedItem,
    onTableChange,
    pagination,
    sorting,
  } = useHostsTable(hostNodes, {
    time: searchCriteria.dateRange,
  });

  return (
    <>
      <EuiInMemoryTable
        allowNeutralSort={false}
        data-test-subj="hostsView-table"
        pagination={{ ...pagination, pageSizeOptions: [2, 5, 10] }}
        sorting={{ sort: sorting }}
        rowProps={{
          'data-test-subj': 'hostsView-tableRow',
        }}
        onChange={onTableChange}
        items={items}
        columns={columns}
        loading={loading}
        message={
          loading ? (
            <FormattedMessage
              id="xpack.infra.waffle.loadingDataText"
              defaultMessage="Loading data"
            />
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
      {isFlyoutOpen && clickedItem && <Flyout node={clickedItem} closeFlyout={closeFlyout} />}
    </>
  );
};
