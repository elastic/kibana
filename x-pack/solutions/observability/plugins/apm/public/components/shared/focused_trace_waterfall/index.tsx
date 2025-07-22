/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { useState } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiSpacer, EuiCallOut } from '@elastic/eui';
import type { APIReturnType } from '../../../services/rest/create_call_apm_api';
import { TraceWaterfall } from '../trace_waterfall';
import type { TraceItem } from '../../../../common/waterfall/unified_trace_item';
import { TraceSummary } from './trace_summary';

type FocusedTrace = APIReturnType<'GET /internal/apm/traces/{traceId}/{docId}'>;

interface Props {
  items: FocusedTrace;
  isEmbeddable?: boolean;
  onErrorClick?: (params: { traceId: string; docId: string }) => void;
}

export function flattenChildren(
  children: NonNullable<FocusedTrace['traceItems']>['focusedTraceTree']
) {
  function convert(
    child: NonNullable<FocusedTrace['traceItems']>['focusedTraceTree'][0]
  ): Array<NonNullable<FocusedTrace['traceItems']>['rootDoc']> {
    const convertedChildren = child.children?.length ? child.children.flatMap(convert) : [];
    return [child.traceDoc, ...convertedChildren];
  }

  return children.flatMap(convert);
}

export function reparentDocumentToRoot(items: FocusedTrace['traceItems']) {
  if (!items) {
    return undefined;
  }
  const clonedItems = structuredClone(items);
  const rootDocId = clonedItems.rootDoc.id;

  if (rootDocId === clonedItems.focusedTraceDoc.id || rootDocId === clonedItems.parentDoc?.id) {
    return clonedItems;
  }

  if (clonedItems.parentDoc) {
    clonedItems.parentDoc.parentId = rootDocId;
  } else {
    clonedItems.focusedTraceDoc.parentId = rootDocId;
  }
  return clonedItems;
}

function getTraceItems(items: NonNullable<FocusedTrace['traceItems']>) {
  const children = items.focusedTraceTree || [];
  const childrenItems = flattenChildren(children);

  const traceItems = [
    items.rootDoc,
    items.parentDoc?.id === items.rootDoc.id ? undefined : items.parentDoc,
    items.focusedTraceDoc.id === items.rootDoc.id ? undefined : items.focusedTraceDoc,
    ...childrenItems,
  ].filter(Boolean) as TraceItem[];

  return traceItems;
}

export function FocusedTraceWaterfall({ items, onErrorClick }: Props) {
  const reparentedItems = reparentDocumentToRoot(items.traceItems);
  const [isCalloutVisible, setIsCalloutVisible] = useState(!reparentedItems);

  if (!reparentedItems) {
    return isCalloutVisible ? (
      <EuiCallOut
        title={i18n.translate('xpack.apm.focusedTraceWaterfall.euiCallOut.incompleteTraceLabel', {
          defaultMessage:
            'The waterfall visual may be incomplete or missing until processing finishes. Try refreshing the page or adjusting the time range.',
        })}
        size="s"
        color="warning"
        onDismiss={() => setIsCalloutVisible(false)}
      />
    ) : null;
  }

  const traceItems = getTraceItems(reparentedItems);

  return (
    <>
      <TraceWaterfall
        traceItems={traceItems}
        showAccordion={false}
        highlightedTraceId={reparentedItems.focusedTraceDoc.id}
        onErrorClick={onErrorClick}
      />
      <EuiSpacer />
      <TraceSummary summary={items.summary} />
    </>
  );
}
