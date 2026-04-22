/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  UnifiedDocViewerObservabilityTraceDocFlyout,
  unifiedDocViewerObservabilityTracesSpanFlyoutId,
} from '@kbn/unified-doc-viewer-plugin/public';
import React, { useCallback, useMemo, useState } from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { useAdHocApmDataView } from '../../../../hooks/use_adhoc_apm_data_view';
import { useTimeRange } from '../../../../hooks/use_time_range';
import { FullTraceWaterfallRenderer } from '../../../shared/trace_waterfall/full_trace_waterfall_renderer';

const TRACE_WATERFALL_FLYOUT_HISTORY_KEY = Symbol.for('apmTraceWaterfallFlyout');

interface Props {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  isOpen: boolean;
  onClose: () => void;
  contextSpanIds?: string[];
}

export function TraceWaterfallFlyout({
  traceId,
  rangeFrom,
  rangeTo,
  isOpen,
  onClose,
  contextSpanIds,
}: Props) {
  const { core } = useApmPluginContext();
  const { start, end } = useTimeRange({ rangeFrom, rangeTo });
  const { dataView, apmIndices } = useAdHocApmDataView();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  const indexes = useMemo(
    () => ({
      apm: {
        traces: apmIndices?.transaction,
        errors: apmIndices?.error,
      },
    }),
    [apmIndices?.transaction, apmIndices?.error]
  );

  const closeDetailFlyout = useCallback(() => setSelectedDocId(null), []);

  if (!isOpen) return null;

  return (
    <EuiFlyout
      session="start"
      historyKey={TRACE_WATERFALL_FLYOUT_HISTORY_KEY}
      onClose={onClose}
      size="m"
      aria-label={i18n.translate('xpack.apm.traceWaterfallFlyout.ariaLabel', {
        defaultMessage: 'Full trace waterfall flyout',
      })}
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2>
            {i18n.translate('xpack.apm.traceWaterfallFlyout.title', {
              defaultMessage: 'Full trace',
            })}
          </h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <FullTraceWaterfallRenderer
          traceId={traceId}
          rangeFrom={start}
          rangeTo={end}
          core={core}
          contextSpanIds={contextSpanIds}
          onNodeClick={setSelectedDocId}
        />
      </EuiFlyoutBody>
      {selectedDocId && dataView && (
        <UnifiedDocViewerObservabilityTraceDocFlyout
          type={unifiedDocViewerObservabilityTracesSpanFlyoutId}
          docId={selectedDocId}
          traceId={traceId}
          dataView={dataView}
          indexes={indexes}
          onCloseFlyout={closeDetailFlyout}
        />
      )}
    </EuiFlyout>
  );
}
