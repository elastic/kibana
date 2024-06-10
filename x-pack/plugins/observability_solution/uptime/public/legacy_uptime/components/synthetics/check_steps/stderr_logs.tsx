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
import { i18n } from '@kbn/i18n';

import { EuiInMemoryTable } from '@elastic/eui';
import moment from 'moment';
import { useSelector } from 'react-redux';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { useFetcher } from '@kbn/observability-shared-plugin/public';
import { useStdErrorLogs } from './use_std_error_logs';
import { ClientPluginsStart } from '../../../../plugin';
import { selectDynamicSettings } from '../../../state/selectors';
import { Ping } from '../../../../../common/runtime_types';

export const StdErrorLogs = ({
  monitorId,
  checkGroup,
  timestamp,
  title,
  summaryMessage,
  hideTitle = false,
}: {
  monitorId?: string;
  checkGroup?: string;
  timestamp?: string;
  title?: string;
  summaryMessage?: string;
  hideTitle?: boolean;
}) => {
  const columns = [
    {
      field: '@timestamp',
      name: TIMESTAMP_LABEL,
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

  const { items, loading } = useStdErrorLogs({ monitorId, checkGroup });

  const { discover, exploratoryView } = useKibana<ClientPluginsStart>().services;

  const { settings } = useSelector(selectDynamicSettings);

  const { data: discoverLink } = useFetcher(async () => {
    if (settings?.heartbeatIndices) {
      const dataView = await exploratoryView.getAppDataView(
        'synthetics',
        settings?.heartbeatIndices
      );
      return discover.locator?.getUrl({
        query: { language: 'kuery', query: `monitor.check_group: ${checkGroup}` },
        indexPatternId: dataView?.id,
        columns: ['synthetics.payload.message', 'error.message'],
        timeRange: timestamp
          ? {
              from: moment(timestamp).subtract(10, 'minutes').toISOString(),
              to: moment(timestamp).add(5, 'minutes').toISOString(),
            }
          : undefined,
      });
    }
    return '';
    // FIXME: Dario thinks there is a better way to do this but
    // he's getting tired and maybe the Uptime folks can fix it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkGroup, timestamp]);

  const search = {
    box: {
      incremental: true,
    },
  };

  return (
    <>
      {!hideTitle && (
        <>
          <EuiFlexGroup alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiTitle size="s">
                <h3>{title ?? TEST_RUN_LOGS_LABEL}</h3>
              </EuiTitle>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiLink data-test-subj="syntheticsStdErrorLogsLink">
                <EuiButtonEmpty
                  data-test-subj="syntheticsStdErrorLogsButton"
                  href={discoverLink}
                  iconType="discoverApp"
                  isDisabled={!discoverLink}
                >
                  {VIEW_IN_DISCOVER_LABEL}
                </EuiButtonEmpty>
              </EuiLink>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiCallOut title={ERROR_SUMMARY_LABEL} color="danger" iconType="warning">
            <p>{summaryMessage}</p>
          </EuiCallOut>
        </>
      )}

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

export const TIMESTAMP_LABEL = i18n.translate('xpack.uptime.monitorList.timestamp', {
  defaultMessage: 'Timestamp',
});

export const ERROR_SUMMARY_LABEL = i18n.translate('xpack.uptime.monitorList.errorSummary', {
  defaultMessage: 'Error summary',
});

export const VIEW_IN_DISCOVER_LABEL = i18n.translate('xpack.uptime.monitorList.viewInDiscover', {
  defaultMessage: 'View in discover',
});

export const TEST_RUN_LOGS_LABEL = i18n.translate('xpack.uptime.monitorList.testRunLogs', {
  defaultMessage: 'Test run logs',
});
