/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { History } from 'history';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { useAnyOfApmParams } from '../../../../../../hooks/use_apm_params';
import { useTimeRange } from '../../../../../../hooks/use_time_range';
import { SpanFlyout } from './span_flyout';
import { TransactionFlyout } from './transaction_flyout';
import type { IWaterfall } from './waterfall_helpers/waterfall_helpers';

interface Props {
  waterfallItemId?: string;
  waterfall: IWaterfall;
  toggleFlyout: ({
    history,
    flyoutDetailTab,
  }: {
    history: History;
    flyoutDetailTab?: string;
  }) => void;
}

export function WaterfallFlyout({ waterfallItemId, waterfall, toggleFlyout }: Props) {
  const history = useHistory();
  const {
    query: { flyoutDetailTab, rangeFrom, rangeTo, kuery },
  } = useAnyOfApmParams(
    '/services/{serviceName}/transactions/view',
    '/mobile-services/{serviceName}/transactions/view',
    '/traces/explorer/waterfall',
    '/dependencies/operation'
  );
  const currentItem = waterfall.items.find((item) => item.id === waterfallItemId);

  const { start, end } = useTimeRange({ rangeFrom, rangeTo });

  if (!currentItem) {
    return null;
  }

  switch (currentItem.docType) {
    case 'span':
      const parentTransactionId =
        currentItem.parent?.docType === 'transaction' ? currentItem.parentId : undefined;

      return (
        <SpanFlyout
          totalDuration={waterfall.duration}
          spanId={currentItem.id}
          parentTransactionId={parentTransactionId}
          traceId={currentItem.doc.trace.id}
          onClose={() => toggleFlyout({ history })}
          spanLinksCount={currentItem.spanLinksCount}
          flyoutDetailTab={flyoutDetailTab}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
          kuery={kuery}
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
          flyoutDetailTab={flyoutDetailTab}
          start={start}
          end={end}
        />
      );
    default:
      return null;
  }
}
