/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, PropsWithChildren } from 'react';
import { EuiFlexItem } from '@elastic/eui';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

export type HistoryItemProps = PropsWithChildren<{}>;

export const HistoryItem = memo<HistoryItemProps>(({ children }) => {
  const getTestId = useTestIdGenerator(useDataTestSubj());

  return (
    <EuiFlexItem
      grow={true}
      style={{ flexBasis: '100%' }}
      data-test-subj={getTestId('historyItem')}
    >
      {children}
    </EuiFlexItem>
  );
});

HistoryItem.displayName = 'HistoryItem';

export type HistoryItemComponent = typeof HistoryItem;
