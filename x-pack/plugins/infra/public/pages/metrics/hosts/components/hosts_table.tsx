/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiInMemoryTable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { SnapshotNode } from '../../../../../common/http_api';
import { HostsTableColumns } from './hosts_table_columns';
import { NoData } from '../../../../components/empty_states';
import { InfraLoadingPanel } from '../../../../components/loading';
import { useHostTable } from '../hooks/use_host_table';

interface Props {
  loading: boolean;
  nodes: SnapshotNode[];
  reload: () => Promise<unknown>;
}

export const HostsTable = ({ nodes, loading, reload }: Props) => {
  const noData = nodes.length === 0;
  const items = useHostTable(nodes);
  return (
    <>
      {loading ? (
        <InfraLoadingPanel
          height="100%"
          width="auto"
          text={i18n.translate('xpack.infra.waffle.loadingDataText', {
            defaultMessage: 'Loading data',
          })}
        />
      ) : noData ? (
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
          onRefetch={() => {
            reload();
          }}
          testString="noMetricsDataPrompt"
        />
      ) : (
        <EuiInMemoryTable pagination sorting items={items} columns={HostsTableColumns} />
      )}
    </>
  );
};
