/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { PlaintextStacktrace, Stacktrace } from '@kbn/event-stacktrace';
import { ProcessorEvent } from '@kbn/observability-plugin/common';
import { isEmpty } from 'lodash';
import React from 'react';
import type { Span } from '../../../../typings/es_schemas/ui/span';
import type { Transaction } from '../../../../typings/es_schemas/ui/transaction';
import { useApmPluginContext } from '../../../context/apm_plugin/use_apm_plugin_context';
import type { FlyoutTab } from '../flyout_tabs/to_flyout_tab';
import { toFlyoutTab } from '../flyout_tabs/to_flyout_tab';
import { getGenAiTabContent } from '../genai_tab/get_genai_tab_content';
import { useGenAiData } from '../genai_tab/use_genai_data';
import { SpanMetadata } from '../metadata_table/span_metadata';
import type { SpanLinksCount } from '../span_links';
import { getSpanLinksTabContent } from '../span_links/span_links_tab_content';
import { SPAN_FLYOUT_EBT_ELEMENTS } from './ebt_constants';

/** Resolves the waterfall span flyout tabs: Metadata, then Stack Trace, Span links, and GenAI when present. */
export function useSpanFlyoutTabs({
  span,
  parentTransaction,
  spanLinksCount,
}: {
  span?: Span;
  parentTransaction?: Transaction;
  spanLinksCount: SpanLinksCount;
}): FlyoutTab[] {
  const { core } = useApmPluginContext();
  const { metadata, isMetadataLoading, isGenAiSpan, genAi } = useGenAiData({
    processorEvent: ProcessorEvent.span,
    id: span?.span?.id,
    timestamp: span?.['@timestamp'],
  });

  if (!span) {
    return [];
  }

  const stackframes = span.span?.stacktrace;
  const plaintextStacktrace = span.code?.stacktrace;
  const codeLanguage = parentTransaction?.service?.language?.name;

  const spanLinksTabContent = getSpanLinksTabContent({
    spanLinksCount,
    traceId: span.trace?.id,
    spanId: span.span?.id,
    processorEvent: ProcessorEvent.span,
  });

  const genAiTabContent = isMetadataLoading
    ? undefined
    : getGenAiTabContent({
        isGenAiSpan,
        genAi,
        ebt: { element: SPAN_FLYOUT_EBT_ELEMENTS.TABS },
        reportEvent: core.analytics.reportEvent,
        resourceId: span.span?.id,
      });

  return [
    toFlyoutTab({
      id: 'metadata',
      'data-test-subj': 'spanFlyoutTab-metadata',
      name: i18n.translate('xpack.apm.propertiesTable.tabs.metadataLabel', {
        defaultMessage: 'Metadata',
      }),
      content: (
        <SpanMetadata span={span} prefetchedMetadata={{ metadata, isLoading: isMetadataLoading }} />
      ),
    }),
    ...(!isEmpty(stackframes) || !isEmpty(plaintextStacktrace)
      ? [
          toFlyoutTab({
            id: 'stack-trace',
            'data-test-subj': 'spanStacktraceTab',
            name: i18n.translate('xpack.apm.transactionDetails.spanFlyout.stackTraceTabLabel', {
              defaultMessage: 'Stack Trace',
            }),
            content: stackframes ? (
              <Stacktrace stackframes={stackframes} codeLanguage={codeLanguage} />
            ) : (
              <PlaintextStacktrace stacktrace={plaintextStacktrace} codeLanguage={codeLanguage} />
            ),
          }),
        ]
      : []),
    ...(spanLinksTabContent ? [toFlyoutTab(spanLinksTabContent)] : []),
    ...(genAiTabContent ? [toFlyoutTab(genAiTabContent)] : []),
  ];
}
