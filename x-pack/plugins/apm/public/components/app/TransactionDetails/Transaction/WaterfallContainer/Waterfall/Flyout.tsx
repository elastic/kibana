/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { SpanFlyout } from './SpanFlyout';
import { TransactionFlyout } from './TransactionFlyout';
import { IWaterfall } from './waterfall_helpers/waterfall_helpers';
import { useUrlParams } from '../../../../../../hooks/useUrlParams';

interface Props {
  waterfall: IWaterfall;
  onClose: () => void;
}

export function Flyout({ waterfall, onClose }: Props) {
  const { urlParams } = useUrlParams();
  const currentItem =
    urlParams.waterfallItemId && waterfall.itemsById[urlParams.waterfallItemId];

  if (!currentItem) {
    return null;
  }

  switch (currentItem.docType) {
    case 'span':
      const parentTransaction = waterfall.getTransactionById(
        currentItem.parentId
      );

      return (
        <SpanFlyout
          totalDuration={waterfall.duration}
          span={currentItem.span}
          parentTransaction={parentTransaction}
          onClose={onClose}
        />
      );
    case 'transaction':
      return (
        <TransactionFlyout
          transaction={currentItem.transaction}
          onClose={onClose}
          traceRootDuration={waterfall.traceRootDuration}
          errorCount={currentItem.errorCount}
        />
      );
    default:
      return null;
  }
}
