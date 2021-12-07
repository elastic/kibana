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
      const parentTransaction =
        currentItem.parent?.docType === 'transaction'
          ? currentItem.parent?.doc
          : undefined;

      return (
        <SpanFlyout
          totalDuration={waterfall.duration}
          span={currentItem.doc}
          parentTransaction={parentTransaction}
          onClose={() => toggleFlyout({ history })}
        />
      );
    case 'transaction':
      return (
        <TransactionFlyout
          transaction={currentItem.doc}
          onClose={() => toggleFlyout({ history })}
          rootTransactionDuration={
            waterfall.rootTransaction?.transaction.duration.us
          }
          errorCount={waterfall.getErrorCount(currentItem.id)}
        />
      );
    default:
      return null;
  }
}
