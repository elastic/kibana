/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiSelectable, EuiSelectableProps } from '@elastic/eui';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithInputHistory } from '../../../hooks/state_selectors/use_with_input_history';

export const CommandInputHistory = memo(() => {
  const dispatch = useConsoleStateDispatch();
  const inputHistory = useWithInputHistory();

  const selectableHistoryOptions = useMemo<EuiSelectableProps['options']>(() => {
    return inputHistory.map((inputItem) => {
      return {
        label: inputItem.input,
        key: inputItem.id,
      };
    });
  }, [inputHistory]);

  const renderAsIs: EuiSelectableProps['children'] = useCallback((list) => {
    return list;
  }, []);

  const handleSelectableOnChange: EuiSelectableProps['onChange'] = useCallback(
    (items) => {
      const selected = items.find((item) => item.checked === 'on');

      if (selected) {
        dispatch({ type: 'executeCommand', payload: { input: selected.label } });
      }

      dispatch({ type: 'updateInputPopoverState', payload: { show: undefined } });
    },
    [dispatch]
  );

  return (
    <div>
      <EuiSelectable
        options={selectableHistoryOptions}
        onChange={handleSelectableOnChange}
        singleSelection={true}
      >
        {renderAsIs}
      </EuiSelectable>
    </div>
  );
});
CommandInputHistory.displayName = 'CommandInputHistory';
