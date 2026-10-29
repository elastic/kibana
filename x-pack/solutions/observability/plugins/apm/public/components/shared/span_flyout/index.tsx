/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiSkeletonText } from '@elastic/eui';
import { FlyoutTemplate } from '@kbn/flyout-template';
import { i18n } from '@kbn/i18n';
import React from 'react';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useFetcher, isPending } from '../../../hooks/use_fetcher';
import type { SpanLinksCount } from '../span_links';
import { useSpanDatabaseSection } from './span_db';
import { SPAN_DETAILS_LABEL, useSpanFlyoutHeader } from './use_span_flyout_header';
import { useSpanFlyoutMenuProps } from './use_span_flyout_menu_props';
import { useSpanFlyoutTabs } from './use_span_flyout_tabs';

const COMPOSITE_WARNING = i18n.translate(
  'xpack.apm.transactionDetails.spanFlyout.compositeExampleWarning',
  {
    defaultMessage: 'This is a sample document for a group of consecutive, similar spans',
  }
);

interface Props {
  spanId: string;
  parentTransactionId?: string;
  traceId: string;
  totalDuration?: number;
  spanLinksCount: SpanLinksCount;
  flyoutDetailTab?: string;
  onClose: () => void;
  rangeFrom: string;
  rangeTo: string;
  kuery?: string;
}

export function SpanFlyout({
  spanId,
  parentTransactionId,
  traceId,
  totalDuration,
  onClose,
  spanLinksCount,
  flyoutDetailTab,
  rangeFrom,
  rangeTo,
  kuery,
}: Props) {
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const { data, status } = useFetcher(
    (callApmApi) => {
      return callApmApi('GET /internal/apm/traces/{traceId}/spans/{spanId}', {
        params: {
          path: { traceId, spanId },
          query: { parentTransactionId, start, end },
        },
      });
    },
    [traceId, spanId, parentTransactionId, start, end]
  );

  // The fetcher keeps the previous document while the next one loads; gate on the status so a
  // switch between waterfall items never shows the previous span.
  const isLoading = isPending(status);
  const span = isLoading ? undefined : data?.span;
  const parentTransaction = isLoading ? undefined : data?.parentTransaction;

  const { metaBlocks, infoBlocks, badges } = useSpanFlyoutHeader({
    span,
    parentTransaction,
    totalDuration,
  });
  const tabs = useSpanFlyoutTabs({ span, parentTransaction, spanLinksCount });
  const databaseSection = useSpanDatabaseSection(span?.span?.db);

  const flyoutMenuProps = useSpanFlyoutMenuProps({
    isSpanLoaded: !!span,
    spanId,
    rangeFrom,
    rangeTo,
    kuery,
  });

  return (
    <FlyoutTemplate
      data-test-subj="spanFlyout"
      onClose={onClose}
      ownFocus
      size="m"
      flyoutMenuProps={flyoutMenuProps}
      tabs={tabs.map(({ tab }) => tab)}
      defaultSelectedTabId={flyoutDetailTab}
      tabBarProps={{ 'data-test-subj': 'spanFlyoutTabs' }}
    >
      <FlyoutTemplate.Header title={SPAN_DETAILS_LABEL} data-test-subj="spanFlyoutHeader">
        {metaBlocks}
        {infoBlocks}
        {badges}
      </FlyoutTemplate.Header>
      <FlyoutTemplate.Body>
        {span?.span?.composite ? (
          <FlyoutTemplate.Body.Callout
            level="warning"
            title={COMPOSITE_WARNING}
            data-test-subj="spanFlyoutCompositeCallout"
          />
        ) : null}
        {databaseSection}
        {isLoading ? <EuiSkeletonText isLoading /> : null}
        {tabs.map(({ tab, panel }) => (
          <FlyoutTemplate.Body.TabPanel key={tab.id} tabId={tab.id}>
            {panel}
          </FlyoutTemplate.Body.TabPanel>
        ))}
      </FlyoutTemplate.Body>
    </FlyoutTemplate>
  );
}
