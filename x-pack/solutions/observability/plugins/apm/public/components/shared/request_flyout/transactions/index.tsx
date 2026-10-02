/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiBasicTable,
  EuiCallOut,
  EuiLink,
  EuiSpacer,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { DISCOVER_APP_LOCATOR } from '@kbn/deeplinks-analytics';
import { i18n } from '@kbn/i18n';
import React, { useCallback } from 'react';
import { asMillisecondDuration, asPercent } from '../../../../../common/utils/formatters';
import { useApmIndexSettingsContext } from '../../../../context/apm_index_settings/use_apm_index_settings_context';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { getESQLQuery } from '../../links/discover_links/get_esql_query';
import { ImpactBar } from '../../impact_bar';
import { useRequestFlyoutContext } from '../request_flyout_context';
import { useRequestFlyoutTransactions } from './use_request_flyout_transactions';
import type { ConnectionTransactionGroup } from './use_request_flyout_transactions';

interface RequestFlyoutAffectedEndpointsProps {
  onTransactionSelect?: (name: string, transactionType: string) => void;
}

/**
 * "Transactions" tab in the edge flyout.
 *
 * Shows source-service transaction groups that directly call the target.
 * All metrics (call latency, calls, failed) are measured from the exit spans,
 * NOT from the full transaction duration.
 *
 * Column names are unified with the Operations tab:
 *   Name · Avg time · Calls · Failed · Time consumed
 *
 * TransactionDetailFlyout state is owned by the parent (RequestFlyout) so that
 * EUI can render it as a side panel sibling to the main flyout.
 */
export function RequestFlyoutAffectedEndpoints({
  onTransactionSelect,
}: RequestFlyoutAffectedEndpointsProps) {
  const {
    connection: { sourceServiceName },
    filters: { environment, rangeFrom, rangeTo },
  } = useRequestFlyoutContext();
  const { items, isLoading, isMaxTransactionsReached } = useRequestFlyoutTransactions();

  // Discover link helpers — called at component level so hooks stay at top-level.
  // getESQLQuery is a pure function, safe to call per-row inside the href callback.
  const { indexSettings = [] } = useApmIndexSettingsContext();
  const { share } = useApmPluginContext();
  const discoverLocator = share?.url.locators.get(DISCOVER_APP_LOCATOR);

  const buildDiscoverHref = useCallback(
    (item: ConnectionTransactionGroup): string | undefined => {
      const esqlQuery = getESQLQuery({
        indexType: 'traces',
        params: {
          serviceName: sourceServiceName,
          transactionName: item.name,
          transactionType: item.transactionType,
          environment,
          sortDirection: 'DESC',
        },
        indexSettings,
      });
      if (!esqlQuery || !discoverLocator) return undefined;
      return discoverLocator.getRedirectUrl({
        timeRange: { from: rangeFrom, to: rangeTo },
        query: { esql: esqlQuery },
      });
    },
    [sourceServiceName, environment, rangeFrom, rangeTo, indexSettings, discoverLocator]
  );

  const onTransactionClick = useCallback(
    (item: ConnectionTransactionGroup) => {
      if (!item.transactionType || !onTransactionSelect) return;
      onTransactionSelect(item.name, item.transactionType);
    },
    [onTransactionSelect]
  );

  const columns: Array<EuiBasicTableColumn<ConnectionTransactionGroup>> = [
    {
      field: 'name',
      name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.column.transaction', {
        defaultMessage: 'Name',
      }),
      truncateText: true,
      render: (name: string, item: ConnectionTransactionGroup) => (
        <EuiLink
          data-test-subj={`requestFlyoutTransactionNameLink-${name}`}
          onClick={() => onTransactionClick(item)}
        >
          {name}
        </EuiLink>
      ),
    },
    {
      field: 'avgCallLatency',
      name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.column.avgTime', {
        defaultMessage: 'Avg time',
      }),
      align: 'right' as const,
      render: (value: number | null) =>
        value == null ? '—' : asMillisecondDuration(value),
    },
    {
      field: 'callCount',
      name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.column.calls', {
        defaultMessage: 'Calls',
      }),
      align: 'right' as const,
      render: (value: number) => value.toLocaleString(),
    },
    {
      field: 'failedCallRate',
      name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.column.failed', {
        defaultMessage: 'Failed',
      }),
      align: 'right' as const,
      render: (value: number | null) => (value == null ? '—' : asPercent(value, 1)),
    },
    {
      field: 'timeConsumedPct',
      name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.column.timeConsumed', {
        defaultMessage: 'Time consumed',
      }),
      align: 'right' as const,
      render: (value: number | null) =>
        value == null ? '—' : <ImpactBar value={value * 100} size="m" />,
    },
    {
      name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.column.actions', {
        defaultMessage: 'Actions',
      }),
      align: 'right' as const,
      width: '60px',
      actions: [
        {
          name: i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.action.viewInDiscover', {
            defaultMessage: 'View traces in Discover',
          }),
          description: i18n.translate(
            'xpack.apm.requestFlyout.affectedEndpoints.action.viewInDiscover.description',
            { defaultMessage: 'Open traces for this transaction in Discover' }
          ),
          type: 'icon' as const,
          icon: 'discoverApp',
          href: (item: ConnectionTransactionGroup) => buildDiscoverHref(item) ?? '',
          available: (item: ConnectionTransactionGroup) => buildDiscoverHref(item) != null,
          'data-test-subj': 'requestFlyoutTransactionViewInDiscover',
        },
      ],
    },
  ];

  return (
    <>
      {isMaxTransactionsReached && (
        <>
          <EuiCallOut
            size="s"
            color="warning"
            iconType="warning"
            title={i18n.translate(
              'xpack.apm.requestFlyout.affectedEndpoints.maxTransactionsWarning',
              {
                defaultMessage:
                  'Not all transactions are shown. Results are based on a sample of {max} calls.',
                values: { max: '1 000' },
              }
            )}
          />
          <EuiSpacer size="s" />
        </>
      )}
      <section data-test-subj="requestFlyoutSection-affectedEndpoints">
        <EuiBasicTable
          columns={columns}
          items={items}
          loading={isLoading}
          noItemsMessage={
            isLoading
              ? i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.loadingLabel', {
                  defaultMessage: 'Loading transactions…',
                })
              : i18n.translate('xpack.apm.requestFlyout.affectedEndpoints.noDataLabel', {
                  defaultMessage: 'No transactions found between these services.',
                })
          }
          rowProps={(item) => ({
            'data-test-subj': `affectedEndpointRow-${item.name}`,
          })}
          data-test-subj="requestFlyoutAffectedEndpointsTable"
        />
      </section>
    </>
  );
}
