/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { TraceWaterfall } from '../trace_waterfall';
import { TraceSummary } from './trace_summary';

type FocusedTrace = APIReturnType<'GET /internal/apm/unified_traces/{traceId}/summary'>;

interface Props {
  items: FocusedTrace;
  isEmbeddable?: boolean;
  onErrorClick?: (params: { traceId: string; docId: string }) => void;
}

export function FocusedTraceWaterfall({ items, onErrorClick, isEmbeddable }: Props) {
  return (
    <>
      <TraceWaterfall
        traceItems={items.traceItems}
        traceParentChildrenMap={items.traceParentChildrenMap}
        showAccordion={false}
        highlightedTraceId={items.highlightId}
        onErrorClick={onErrorClick}
        isEmbeddable={isEmbeddable}
      />
      {items.highlightId ? (
        <>
          <EuiSpacer />
          <TraceSummary summary={items.summary} />
        </>
      ) : null}
    </>
  );
}
