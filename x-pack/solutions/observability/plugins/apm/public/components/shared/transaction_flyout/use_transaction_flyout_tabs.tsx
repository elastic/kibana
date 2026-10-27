/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import React from 'react';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import type { FlyoutTab } from '../flyout_tabs/to_flyout_tab';
import { toFlyoutTab } from '../flyout_tabs/to_flyout_tab';
import { getGenAiTabContent } from '../genai_tab/get_genai_tab_content';
import { useGenAiData } from '../genai_tab/use_genai_data';
import { TransactionMetadata } from '../metadata_table/transaction_metadata';
import type { SpanLinksCount } from '../span_links';
import { getSpanLinksTabContent } from '../span_links/span_links_tab_content';
import { TRANSACTION_FLYOUT_EBT_ELEMENTS } from './ebt_constants';

/** Resolves the waterfall transaction flyout tabs: Metadata, then GenAI and Span links when present. */
export function useTransactionFlyoutTabs({
  transaction,
  spanLinksCount,
}: {
  transaction?: Transaction;
  spanLinksCount: SpanLinksCount;
}): FlyoutTab[] {
  const { core } = useApmPluginContext();
  const { metadata, isMetadataLoading, isGenAiSpan, genAi } = useGenAiData({
    processorEvent: ProcessorEvent.transaction,
    id: transaction?.transaction?.id,
    timestamp: transaction?.['@timestamp'],
  });

  if (!transaction) {
    return [];
  }

  const genAiTabContent = isMetadataLoading
    ? undefined
    : getGenAiTabContent({
        isGenAiSpan,
        genAi,
        ebt: { element: TRANSACTION_FLYOUT_EBT_ELEMENTS.TABS },
        reportEvent: core.analytics.reportEvent,
        resourceId: transaction.transaction?.id,
      });

  const spanLinksTabContent = getSpanLinksTabContent({
    spanLinksCount,
    traceId: transaction.trace?.id,
    spanId: transaction.transaction?.id,
    processorEvent: ProcessorEvent.transaction,
  });

  return [
    toFlyoutTab({
      id: 'metadata',
      'data-test-subj': 'transactionFlyoutTab-metadata',
      name: i18n.translate('xpack.apm.propertiesTable.tabs.metadataLabel', {
        defaultMessage: 'Metadata',
      }),
      content: (
        <TransactionMetadata
          transaction={transaction}
          prefetchedMetadata={{ metadata, isLoading: isMetadataLoading }}
        />
      ),
    }),
    ...(genAiTabContent ? [toFlyoutTab(genAiTabContent)] : []),
    ...(spanLinksTabContent ? [toFlyoutTab(spanLinksTabContent)] : []),
  ];
}
