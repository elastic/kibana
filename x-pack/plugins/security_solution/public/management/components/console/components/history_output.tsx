/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useEffect } from 'react';
import { CommonProps, EuiFlexGroup } from '@elastic/eui';
import { useCommandHistory } from '../hooks/state_selectors/use_command_history';
import { useConsoleStateDispatch } from '../hooks/state_selectors/use_console_state_dispatch';
import { useTestIdGenerator } from '../../hooks/use_test_id_generator';
import { useDataTestSubj } from '../hooks/state_selectors/use_data_test_subj';

export type OutputHistoryProps = CommonProps;

export const HistoryOutput = memo<OutputHistoryProps>((commonProps) => {
  const historyItems = useCommandHistory();
  const dispatch = useConsoleStateDispatch();
  const getTestId = useTestIdGenerator(useDataTestSubj());

  // Anytime we add a new item to the history
  // scroll down so that command input remains visible
  useEffect(() => {
    dispatch({ type: 'scrollDown' });
  }, [dispatch, historyItems.length]);

  return (
    <EuiFlexGroup
      data-test-subj={getTestId('historyOutput')}
      {...commonProps}
      wrap={true}
      direction="row"
      alignItems="flexEnd"
      responsive={false}
    >
      {historyItems}
    </EuiFlexGroup>
  );
});

HistoryOutput.displayName = 'HistoryOutput';
