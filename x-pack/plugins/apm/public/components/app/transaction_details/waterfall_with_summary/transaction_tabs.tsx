/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSpacer, EuiTab, EuiTabs, EuiLoadingContent } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { LogStream } from '@kbn/infra-plugin/public';
import React from 'react';
import { Transaction } from '../../../../../typings/es_schemas/ui/transaction';
import { TransactionMetadata } from '../../../shared/metadata_table/transaction_metadata';
import { WaterfallContainer } from './waterfall_container';
import { IWaterfall } from './waterfall_container/waterfall/waterfall_helpers/waterfall_helpers';

interface Props {
  transaction?: Transaction;
  isLoading: boolean;
  waterfall: IWaterfall;
  detailTab?: TransactionTab;
  serviceName?: string;
  waterfallItemId?: string;
  onTabClick: (tab: TransactionTab) => void;
}

export function TransactionTabs({
  transaction,
  waterfall,
  isLoading,
  detailTab,
  waterfallItemId,
  serviceName,
  onTabClick,
}: Props) {
  const tabs = [timelineTab, metadataTab, logsTab];
  const currentTab = tabs.find(({ key }) => key === detailTab) ?? timelineTab;
  const TabContent = currentTab.component;

  return (
    <>
      <EuiTabs>
        {tabs.map(({ key, label }) => {
          return (
            <EuiTab
              onClick={() => {
                onTabClick(key);
              }}
              isSelected={currentTab.key === key}
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
        <TabContent
          waterfallItemId={waterfallItemId}
          serviceName={serviceName}
          waterfall={waterfall}
          transaction={transaction}
        />
      )}
    </>
  );
}

export enum TransactionTab {
  timeline = 'timeline',
  metadata = 'metadata',
  logs = 'logs',
}

const timelineTab = {
  key: TransactionTab.timeline,
  label: i18n.translate('xpack.apm.propertiesTable.tabs.timelineLabel', {
    defaultMessage: 'Timeline',
  }),
  component: TimelineTabContent,
};

const metadataTab = {
  key: TransactionTab.metadata,
  label: i18n.translate('xpack.apm.propertiesTable.tabs.metadataLabel', {
    defaultMessage: 'Metadata',
  }),
  component: MetadataTabContent,
};

const logsTab = {
  key: TransactionTab.logs,
  label: i18n.translate('xpack.apm.propertiesTable.tabs.logsLabel', {
    defaultMessage: 'Logs',
  }),
  component: LogsTabContent,
};

function TimelineTabContent({
  waterfall,
  waterfallItemId,
  serviceName,
}: {
  waterfallItemId?: string;
  serviceName?: string;
  waterfall: IWaterfall;
}) {
  return (
    <WaterfallContainer
      waterfallItemId={waterfallItemId}
      serviceName={serviceName}
      waterfall={waterfall}
    />
  );
}

function MetadataTabContent({ transaction }: { transaction: Transaction }) {
  return <TransactionMetadata transaction={transaction} />;
}

function LogsTabContent({ transaction }: { transaction: Transaction }) {
  const startTimestamp = Math.floor(transaction.timestamp.us / 1000);
  const endTimestamp = Math.ceil(
    startTimestamp + transaction.transaction.duration.us / 1000
  );
  const framePaddingMs = 1000 * 60 * 60 * 24; // 24 hours
  return (
    <LogStream
      logView={{ type: 'log-view-reference', logViewId: 'default' }}
      startTimestamp={startTimestamp - framePaddingMs}
      endTimestamp={endTimestamp + framePaddingMs}
      query={`trace.id:"${transaction.trace.id}" OR (not trace.id:* AND "${transaction.trace.id}")`}
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
