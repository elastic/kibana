/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTableColumn,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHighlight,
  EuiLink,
  EuiSpacer,
  EuiTitle,
  formatDate,
} from '@elastic/eui';
import React from 'react';

import { EuiInMemoryTable } from '@elastic/eui';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { useStdErrorLogs } from './use_std_error_logs';
import { useKibana } from '../../../../../../../src/plugins/kibana_react/public';
import { ClientPluginsStart } from '../../../apps/plugin';
import { useFetcher } from '../../../../../observability/public';
import { selectDynamicSettings } from '../../../state/selectors';
import { Ping } from '../../../../common/runtime_types';

export const StdErrorLogs = ({
  configId,
  checkGroup,
  timestamp,
  title,
  summaryMessage,
}: {
  configId?: string;
  checkGroup?: string;
  timestamp?: string;
  title?: string;
  summaryMessage?: string;
}) => {
  const columns = [
    {
      field: '@timestamp',
      name: 'Timestamp',
      sortable: true,
      render: (date: string) => formatDate(date, 'dateTime'),
    },
    {
      field: 'synthetics.payload.message',
      name: 'Message',
      render: (message: string) => (
        <EuiHighlight
          search={message.includes('SyntaxError:') ? 'SyntaxError:' : 'ReferenceError:'}
        >
          {message}
        </EuiHighlight>
      ),
    },
  ] as Array<EuiBasicTableColumn<Ping>>;

  const { items, loading } = useStdErrorLogs({ configId, checkGroup });

  const { discover, observability } = useKibana<ClientPluginsStart>().services;

  const { settings } = useSelector(selectDynamicSettings);

  const { data: discoverLink } = useFetcher(async () => {
    if (settings?.heartbeatIndices) {
      const dataView = await observability.getAppDataView('synthetics', settings?.heartbeatIndices);
      return discover.locator?.getUrl({
        query: { language: 'kuery', query: `monitor.check_group: ${checkGroup}` },
        indexPatternId: dataView?.id,
        columns: ['synthetics.payload.message'],
        timeRange: timestamp
          ? {
              from: moment(timestamp).subtract(10, 'minutes').toISOString(),
              to: moment(timestamp).add(5, 'minutes').toISOString(),
            }
          : undefined,
      });
    }
    return '';
  }, [checkGroup, timestamp]);

  const search = {
    box: {
      incremental: true,
    },
  };

  return (
    <>
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>{title ?? 'Test run logs'}</h3>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiLink>
            <EuiButtonEmpty href={discoverLink} iconType="discoverApp" isDisabled={!discoverLink}>
              View in discover
            </EuiButtonEmpty>
          </EuiLink>
        </EuiFlexItem>
      </EuiFlexGroup>

      <EuiCallOut title="Error summary" color="danger" iconType="alert">
        <p>{summaryMessage}</p>
      </EuiCallOut>

      <EuiSpacer />

      <EuiInMemoryTable
        items={items}
        columns={columns}
        tableLayout="auto"
        loading={loading}
        search={search}
        itemId="id"
        executeQueryOptions={{
          defaultFields: ['@timestamp', 'synthetics.payload.message'],
        }}
      />
    </>
  );
};
