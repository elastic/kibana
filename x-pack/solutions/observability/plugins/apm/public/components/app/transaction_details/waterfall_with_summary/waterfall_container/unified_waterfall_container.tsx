/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Error } from '@kbn/apm-types';
import { TRACE_WATERFALL_EBT_ELEMENTS } from '@kbn/apm-ui-shared';
import { UnifiedDocViewerObservabilityTraceDocFlyout } from '@kbn/unified-doc-viewer-plugin/public';
import type { UnifiedDocViewerObservabilityTracesDocumentType } from '@kbn/unified-doc-viewer-plugin/public';
import type { History } from 'history';
import React, { useCallback, useMemo, useState } from 'react';
import { useHistory } from 'react-router-dom';
import type { TraceItem } from '../../../../../../common/waterfall/unified_trace_item';
import { fromQuery, toQuery } from '../../../../shared/links/url_helpers';
import { UnifiedWaterfallFlyout } from './unified_waterfall_flyout';
import { useErrorClickHandler } from './use_error_click_handler';
import { useGetErrorMarkerHrefFromRouter } from './use_get_error_marker_href_from_router';
import { useGetServiceBadgeHrefFromRouter } from './use_get_service_badge_href_from_router';
import { useKibana } from '../../../../../context/kibana_context/use_kibana';
import { useAdHocApmDataView } from '../../../../../hooks/use_adhoc_apm_data_view';
import { useLogsIndexPattern } from '../../../../../hooks/use_logs_index_pattern';

interface Props {
  traceItems: TraceItem[];
  errors: Error[];
  agentMarks: Record<string, number>;
  waterfallItemId?: string;
  serviceName?: string;
  showCriticalPath: boolean;
  onShowCriticalPathChange: (value: boolean) => void;
  entryTransactionId?: string;
  traceDocsTotal?: number;
  maxTraceItems?: number;
  discoverHref?: string;
  traceId?: string;
}

const toggleFlyout = ({
  history,
  waterfallItemId,
  flyoutDetailTab,
}: {
  history: History;
  waterfallItemId?: string;
  flyoutDetailTab?: string;
}) => {
  history.replace({
    ...history.location,
    search: fromQuery({
      ...toQuery(history.location.search),
      flyoutDetailTab,
      waterfallItemId,
    }),
  });
};

export function UnifiedWaterfallContainer({
  traceItems,
  errors,
  agentMarks,
  serviceName,
  waterfallItemId,
  showCriticalPath,
  onShowCriticalPathChange,
  entryTransactionId,
  traceDocsTotal,
  maxTraceItems,
  discoverHref,
  traceId,
}: Props) {
  const {
    services: { apmShared },
  } = useKibana();
  const TraceWaterfall = useMemo(() => apmShared.TraceWaterfall, [apmShared.TraceWaterfall]);
  const history = useHistory();
  const getServiceBadgeHref = useGetServiceBadgeHrefFromRouter();
  const getErrorMarkerHref = useGetErrorMarkerHrefFromRouter();

  // --- Doc flyout state (for unprocessed OTel errors and multi-error rows) ---
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedDocIndex, setSelectedDocIndex] = useState<string | undefined>(undefined);
  const [activeFlyoutType, setActiveFlyoutType] =
    useState<UnifiedDocViewerObservabilityTracesDocumentType>('span');
  const [activeSection, setActiveSection] = useState<'errors-table' | undefined>(undefined);

  const { dataView, apmIndices } = useAdHocApmDataView();
  const { logsIndexPattern } = useLogsIndexPattern();

  const indexes = useMemo(
    () => ({
      logs: logsIndexPattern,
      apm: {
        traces: apmIndices?.transaction,
        errors: apmIndices?.error,
      },
    }),
    [logsIndexPattern, apmIndices?.transaction, apmIndices?.error]
  );

  const openDocFlyout = useCallback(
    ({
      type,
      docId,
      docIndex,
      activeSection: section,
    }: {
      type: UnifiedDocViewerObservabilityTracesDocumentType;
      docId: string;
      docIndex: string | undefined;
      activeSection: 'errors-table' | undefined;
    }) => {
      setActiveFlyoutType(type);
      setSelectedDocId(docId);
      setSelectedDocIndex(docIndex);
      setActiveSection(section);
    },
    []
  );

  const closeDocFlyout = useCallback(() => {
    setSelectedDocId(null);
    setSelectedDocIndex(undefined);
    setActiveSection(undefined);
  }, []);

  const handleErrorClick = useErrorClickHandler(traceItems, openDocFlyout);

  const handleNodeClick = (id: string, options?: { flyoutDetailTab?: string }) => {
    toggleFlyout({
      history,
      waterfallItemId: id,
      flyoutDetailTab: options?.flyoutDetailTab ?? 'metadata',
    });
  };

  return (
    <div data-test-subj="waterfallContainer">
      <TraceWaterfall
        traceItems={traceItems}
        errors={errors}
        onClick={handleNodeClick}
        onErrorClick={handleErrorClick}
        getServiceBadgeHref={getServiceBadgeHref}
        getErrorMarkerHref={getErrorMarkerHref}
        serviceName={serviceName}
        showLegend
        showCriticalPathControl
        agentMarks={agentMarks}
        showCriticalPath={showCriticalPath}
        onShowCriticalPathChange={onShowCriticalPathChange}
        entryTransactionId={entryTransactionId}
        traceDocsTotal={traceDocsTotal}
        maxTraceItems={maxTraceItems}
        discoverHref={discoverHref}
        ebt={{
          row: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ROW },
          errorBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_ERROR_BADGE },
          serviceBadge: { element: TRACE_WATERFALL_EBT_ELEMENTS.WATERFALL_SERVICE_BADGE },
        }}
      >
        <UnifiedWaterfallFlyout
          waterfallItemId={waterfallItemId}
          traceItems={traceItems}
          toggleFlyout={toggleFlyout}
        />
      </TraceWaterfall>
      {selectedDocId && traceId && dataView && (
        <UnifiedDocViewerObservabilityTraceDocFlyout
          type={activeFlyoutType}
          docId={selectedDocId}
          docIndex={selectedDocIndex}
          traceId={traceId}
          dataView={dataView}
          indexes={indexes}
          activeSection={activeSection}
          onCloseFlyout={closeDocFlyout}
          dataTestSubj="apmWaterfallErrorDocFlyout"
          size="m"
        />
      )}
    </div>
  );
}
