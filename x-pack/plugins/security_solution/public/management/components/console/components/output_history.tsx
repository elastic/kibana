/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo } from 'react';
import { CommonProps, EuiFlexGroup } from '@elastic/eui';
import { HistoryItemComponent } from './history_item';

// FIXME: implement a buffer for how many items should be shown in the console (maybe virtual scrolling)

export type OutputHistoryProps = CommonProps & {
  children: HistoryItemComponent | HistoryItemComponent[];
};

export const OutputHistory = memo<OutputHistoryProps>(({ children, className }) => {
  return (
    <EuiFlexGroup
      className={className}
      wrap={true}
      direction="row"
      alignItems="flexEnd"
      responsive={false}
    >
      {children}
    </EuiFlexGroup>
  );
});

OutputHistory.displayName = 'OutputHistory';
