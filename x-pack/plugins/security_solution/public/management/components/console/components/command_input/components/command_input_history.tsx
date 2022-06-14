/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo } from 'react';
import { EuiFocusTrap, EuiSelectable, EuiSelectableProps } from '@elastic/eui';
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
    const lastIndex = inputHistory.length - 1;
    return inputHistory.map((inputItem, index) => {
      return {
        label: inputItem.input,
        key: inputItem.id,
        className: index === lastIndex ? 'console_input_popover_initial_focus_item' : undefined,
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

      if (selected) {
        dispatch({ type: 'executeCommand', payload: { input: selected.label } });
      }

      dispatch({ type: 'updateInputPopoverState', payload: { show: undefined } });
    },
    [dispatch]
  );

  const handleRenderOption = useCallback((option) => {
    return <UserCommandInput input={option.label} />;
  }, []);

  return (
    <div>
      <EuiFocusTrap clickOutsideDisables={true}>
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
      </EuiFocusTrap>
    </div>
  );
});
CommandInputHistory.displayName = 'CommandInputHistory';
