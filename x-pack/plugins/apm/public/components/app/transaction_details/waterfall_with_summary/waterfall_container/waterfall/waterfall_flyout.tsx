/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { History } from 'history';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { SpanFlyout } from './span_flyout';
import { TransactionFlyout } from './transaction_flyout';
import { IWaterfall } from './waterfall_helpers/waterfall_helpers';

interface Props {
  waterfallItemId?: string;
  waterfall: IWaterfall;
  toggleFlyout: ({ history }: { history: History }) => void;
}

export function WaterfallFlyout({
  waterfallItemId,
  waterfall,
  toggleFlyout,
}: Props) {
  const history = useHistory();
  const currentItem = waterfall.items.find(
    (item) => item.id === waterfallItemId
  );

  if (!currentItem) {
    return null;
  }

  switch (currentItem.docType) {
    case 'span':
      const parentTransactionId =
        currentItem.parent?.docType === 'transaction'
          ? currentItem.parentId
          : undefined;

      return (
        <SpanFlyout
          totalDuration={waterfall.duration}
          spanId={currentItem.id}
          parentTransactionId={parentTransactionId}
          traceId={currentItem.doc.trace.id}
          onClose={() => toggleFlyout({ history })}
          spanLinksCount={currentItem.spanLinksCount}
        />
      );
    case 'transaction':
      return (
        <TransactionFlyout
          transactionId={currentItem.id}
          traceId={currentItem.doc.trace.id}
          onClose={() => toggleFlyout({ history })}
          rootTransactionDuration={waterfall.rootWaterfallTransaction?.duration}
          errorCount={waterfall.getErrorCount(currentItem.id)}
          spanLinksCount={currentItem.spanLinksCount}
        />
      );
    default:
      return null;
  }
}
