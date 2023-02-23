/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab, EuiTabs, EuiLoadingContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LogStream } from '@kbn/infra-plugin/public';
import React, { useMemo } from 'react';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { TransactionMetadata } from '../../../shared/metadata_table/transaction_metadata';
import { WaterfallContainer } from './waterfall_container';
import { IWaterfall } from './waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

export enum TransactionTab {
  timeline = 'timeline',
  metadata = 'metadata',
  logs = 'logs',
}

interface Props {
  transaction?: Transaction;
  isLoading: boolean;
  waterfall: IWaterfall;
  detailTab?: TransactionTab;
  serviceName?: string;
  waterfallItemId?: string;
  onTabClick: (tab: TransactionTab) => void;
  showCriticalPath: boolean;
  onShowCriticalPathChange: (showCriticalPath: boolean) => void;
}

export function TransactionTabs({
  transaction,
  waterfall,
  isLoading,
  detailTab = TransactionTab.timeline,
  waterfallItemId,
  serviceName,
  onTabClick,
  showCriticalPath,
  onShowCriticalPathChange,
}: Props) {
  const tabs: Record<
    TransactionTab,
    { label: string; component: React.ReactNode }
  > = useMemo(
    () => ({
      [TransactionTab.timeline]: {
        label: i18n.translate('xpack.apm.propertiesTable.tabs.timelineLabel', {
          defaultMessage: 'Timeline',
        }),
        component: (
          <TimelineTabContent
            waterfallItemId={waterfallItemId}
            serviceName={serviceName}
            waterfall={waterfall}
            showCriticalPath={showCriticalPath}
            onShowCriticalPathChange={onShowCriticalPathChange}
          />
        ),
      },
      [TransactionTab.metadata]: {
        label: i18n.translate('xpack.apm.propertiesTable.tabs.metadataLabel', {
          defaultMessage: 'Metadata',
        }),
        component: (
          <>{transaction && <MetadataTabContent transaction={transaction} />}</>
        ),
      },
      [TransactionTab.logs]: {
        label: i18n.translate('xpack.apm.propertiesTable.tabs.logsLabel', {
          defaultMessage: 'Logs',
        }),
        component: (
          <>
            {transaction && (
              <LogsTabContent
                timestamp={transaction.timestamp.us}
                duration={transaction.transaction.duration.us}
                traceId={transaction.trace.id}
              />
            )}
          </>
        ),
      },
    }),
    [
      onShowCriticalPathChange,
      serviceName,
      showCriticalPath,
      transaction,
      waterfall,
      waterfallItemId,
    ]
  );

  const currentTab = tabs[detailTab];
  const TabContent = currentTab.component;

  return (
    <>
      <EuiTabs>
        {(Object.keys(TransactionTab) as TransactionTab[]).map((key) => {
          const { label } = tabs[key];
          return (
            <EuiTab
              onClick={() => {
                onTabClick(key);
              }}
              isSelected={detailTab === key}
              key={key}
            >
              {label}
            </EuiTab>
          );
        })}
      </EuiTabs>

      <EuiSpacer />
      {isLoading || !transaction ? (
        <EuiLoadingContent lines={3} data-test-sub="loading-content" />
      ) : (
        <> {TabContent}</>
      )}
    </>
  );
}

function TimelineTabContent({
  waterfall,
  waterfallItemId,
  serviceName,
  showCriticalPath,
  onShowCriticalPathChange,
}: {
  waterfallItemId?: string;
  serviceName?: string;
  waterfall: IWaterfall;
  showCriticalPath: boolean;
  onShowCriticalPathChange: (showCriticalPath: boolean) => void;
}) {
  return (
    <WaterfallContainer
      waterfallItemId={waterfallItemId}
      serviceName={serviceName}
      waterfall={waterfall}
      showCriticalPath={showCriticalPath}
      onShowCriticalPathChange={onShowCriticalPathChange}
    />
  );
}

function MetadataTabContent({ transaction }: { transaction: Transaction }) {
  return <TransactionMetadata transactionId={transaction.transaction.id} />;
}

function LogsTabContent({
  timestamp,
  duration,
  traceId,
}: {
  timestamp: number;
  duration: number;
  traceId: string;
}) {
  const startTimestamp = Math.floor(timestamp / 1000);
  const endTimestamp = Math.ceil(startTimestamp + duration / 1000);
  const framePaddingMs = 1000 * 60 * 60 * 24; // 24 hours
  return (
    <LogStream
      logView={{ type: 'log-view-reference', logViewId: 'default' }}
      startTimestamp={startTimestamp - framePaddingMs}
      endTimestamp={endTimestamp + framePaddingMs}
      query={`trace.id:"${traceId}" OR (not trace.id:* AND "${traceId}")`}
      height={640}
      columns={[
        { type: 'timestamp' },
        {
          type: 'field',
          field: 'service.name',
          header: i18n.translate(
            'xpack.apm.propertiesTable.tabs.logs.serviceName',
            { defaultMessage: 'Service Name' }
          ),
          width: 200,
        },
        { type: 'message' },
      ]}
      showFlyoutAction
    />
  );
}
