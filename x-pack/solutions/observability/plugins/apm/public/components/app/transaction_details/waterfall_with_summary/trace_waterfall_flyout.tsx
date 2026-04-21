/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlyout, EuiFlyoutBody, EuiFlyoutHeader, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { useState } from 'react';
import { useApmPluginContext } from '../../../../context/apm_plugin/use_apm_plugin_context';
import { FullTraceWaterfallRenderer } from '../../../shared/trace_waterfall/full_trace_waterfall_renderer';

export interface TraceWaterfallDetailFlyoutProps {
  docId: string;
  traceId: string;
  onClose: () => void;
}

interface Props {
  traceId: string;
  rangeFrom: string;
  rangeTo: string;
  isOpen: boolean;
  onClose: () => void;
  contextSpanIds?: string[];
  renderDetailFlyout: (props: TraceWaterfallDetailFlyoutProps) => React.ReactNode;
}

export function TraceWaterfallFlyout({
  traceId,
  rangeFrom,
  rangeTo,
  isOpen,
  onClose,
  contextSpanIds,
  renderDetailFlyout,
}: Props) {
  const { core } = useApmPluginContext();
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);

  if (!isOpen) return null;

  return (
    <EuiFlyout onClose={onClose} size="l">
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
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          core={core}
          contextSpanIds={contextSpanIds}
          onNodeClick={setSelectedDocId}
        />
      </EuiFlyoutBody>
      {selectedDocId &&
        renderDetailFlyout({
          docId: selectedDocId,
          traceId,
          onClose: () => setSelectedDocId(null),
        })}
    </EuiFlyout>
  );
}
