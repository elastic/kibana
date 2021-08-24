/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren } from 'react';
import { EuiFlexItem } from '@elastic/eui';

export type HistoryItemProps = PropsWithChildren<{}>;

export const HistoryItem = memo<HistoryItemProps>(({ children }) => {
  return (
    <EuiFlexItem grow={true} style={{ flexBasis: '100%' }}>
      {children}
    </EuiFlexItem>
  );
});

HistoryItem.displayName = 'HistoryItem';

export type HistoryItemComponent = typeof HistoryItem;
