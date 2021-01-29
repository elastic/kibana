/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { History, Location } from 'history';
import React from 'react';
import { useHistory } from 'react-router-dom';
import { SpanFlyout } from './SpanFlyout';
import { TransactionFlyout } from './TransactionFlyout';
import { IWaterfall } from './waterfall_helpers/waterfall_helpers';

interface Props {
  waterfallItemId?: string;
  waterfall: IWaterfall;
  location: Location;
  toggleFlyout: ({
    history,
    location,
  }: {
    history: History;
    location: Location;
  }) => void;
}

export function WaterfallFlyout({
  waterfallItemId,
  waterfall,
  location,
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
          onClose={() => toggleFlyout({ history, location })}
        />
      );
    case 'transaction':
      return (
        <TransactionFlyout
          transaction={currentItem.doc}
          onClose={() => toggleFlyout({ history, location })}
          rootTransactionDuration={
            waterfall.rootTransaction?.transaction.duration.us
          }
          errorCount={waterfall.errorsPerTransaction[currentItem.id]}
        />
      );
    default:
      return null;
  }
}
