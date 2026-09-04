/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TraceItem } from '@kbn/apm-types';
import { useTraceWaterfallContext } from '@kbn/apm-ui-shared';
import type { History } from 'history';
import React, { useMemo } from 'react';
import { useHistory } from 'react-router-dom';
import { useAnyOfApmParams } from '../../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../../hooks/use_time_range';
import { SpanFlyout } from '../../../../shared/span_flyout';
import { TransactionFlyout } from '../../../../shared/transaction_flyout';

interface Props {
  waterfallItemId?: string;
  traceItems: TraceItem[];
  toggleFlyout: (params: { history: History; flyoutDetailTab?: string }) => void;
}

export function UnifiedWaterfallFlyout({ waterfallItemId, traceItems, toggleFlyout }: Props) {
  const history = useHistory();

  const { duration, rootItem } = useTraceWaterfallContext();
  const rootTransactionDuration =
    rootItem?.docType === 'transaction' ? rootItem.duration : undefined;

  const {
    query: { flyoutDetailTab, rangeFrom, rangeTo },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/dependencies/operation'
  );

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  const traceItemsById = useMemo(
    () => new Map(traceItems.map((item) => [item.id, item])),
    [traceItems]
  );

  const currentItem = waterfallItemId ? traceItemsById.get(waterfallItemId) : undefined;

  if (!currentItem) {
    return null;
  }

  switch (currentItem.docType) {
    case 'span':
      const parentItem = currentItem.parentId
        ? traceItemsById.get(currentItem.parentId)
        : undefined;
      const parentTransactionId = parentItem?.docType === 'transaction' ? parentItem.id : undefined;

      return (
        <SpanFlyout
          totalDuration={duration}
          spanId={currentItem.id}
          parentTransactionId={parentTransactionId}
          traceId={currentItem.traceId}
          onClose={() => toggleFlyout({ history })}
          spanLinksCount={{
            linkedChildren: currentItem.spanLinksCount.incoming,
            linkedParents: currentItem.spanLinksCount.outgoing,
          }}
          flyoutDetailTab={flyoutDetailTab}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
        />
      );
    case 'transaction':
      return (
        <TransactionFlyout
          transactionId={currentItem.id}
          traceId={currentItem.traceId}
          onClose={() => toggleFlyout({ history })}
          rootTransactionDuration={rootTransactionDuration}
          errorCount={currentItem.errors.length}
          spanLinksCount={{
            linkedChildren: currentItem.spanLinksCount.incoming,
            linkedParents: currentItem.spanLinksCount.outgoing,
          }}
          flyoutDetailTab={flyoutDetailTab}
          start={start}
          end={end}
        />
      );
    default:
      return null;
  }
}
