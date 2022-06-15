/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiSelectable, EuiSelectableProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { UserCommandInput } from '../../user_command_input';
import { InputHistoryItem } from '../../console_state/types';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithInputHistory } from '../../../hooks/state_selectors/use_with_input_history';

const NO_HISTORY_EMPTY_MESSAGE = i18n.translate(
  'xpack.securitySolution.commandInputHistory.noHistoryEmptyMessage',
  { defaultMessage: 'No commands have been entered' }
);

export const CommandInputHistory = memo(() => {
  const dispatch = useConsoleStateDispatch();
  const inputHistory = useWithInputHistory();

  const selectableHistoryOptions = useMemo<EuiSelectableProps<InputHistoryItem>['options']>(() => {
    return inputHistory.map((inputItem, index) => {
      return {
        label: inputItem.input,
        key: inputItem.id,
      };
    });
  }, [inputHistory]);

  const selectableListProps: EuiSelectableProps<InputHistoryItem>['listProps'] = useMemo(() => {
    return {
      showIcons: false,
    };
  }, []);

  const renderAsIs: EuiSelectableProps<InputHistoryItem>['children'] = useCallback((list) => {
    return list;
  }, []);

  const handleSelectableOnChange: EuiSelectableProps<InputHistoryItem>['onChange'] = useCallback(
    (items) => {
      const selected = items.find((item) => item.checked === 'on');

      dispatch({ type: 'updateInputPopoverState', payload: { show: undefined } });
      dispatch({ type: 'addFocusToKeyCapture' });

      if (selected) {
        dispatch({ type: 'updateInputTextEnteredState', payload: { textEntered: selected.label } });
      }
    },
    [dispatch]
  );

  const handleRenderOption = useCallback((option) => {
    return <UserCommandInput input={option.label} />;
  }, []);

  return (
    <div>
      <EuiSelectable<InputHistoryItem>
        options={selectableHistoryOptions}
        onChange={handleSelectableOnChange}
        renderOption={handleRenderOption}
        listProps={selectableListProps}
        singleSelection={true}
        emptyMessage={NO_HISTORY_EMPTY_MESSAGE}
      >
        {renderAsIs}
      </EuiSelectable>
    </div>
  );
});
CommandInputHistory.displayName = 'CommandInputHistory';
