/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { useTraceWaterfallContext } from './trace_waterfall_context';
import { TraceDataState } from './use_trace_waterfall';

const FALLBACK_WARNING = i18n.translate(
  'xpack.apm.traceWaterfallContext.warningMessage.fallbackWarning',
  {
    defaultMessage:
      'The trace document is incomplete and not all spans have arrived yet. Try refreshing the page or adjusting the time range.',
  }
);

export function TraceWarning({ children }: { children: React.ReactNode }) {
  const { traceState } = useTraceWaterfallContext();

  switch (traceState) {
    case TraceDataState.Partial:
      return (
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiCallOut
              data-test-subj="traceWarning"
              color="warning"
              size="s"
              title={FALLBACK_WARNING}
            />
          </EuiFlexItem>
          <EuiFlexItem>{children}</EuiFlexItem>
        </EuiFlexGroup>
      );

    case TraceDataState.Empty:
      return (
        <EuiCallOut
          data-test-subj="traceWarning"
          color="warning"
          size="s"
          title={FALLBACK_WARNING}
        />
      );

    default:
      return children;
  }
}
