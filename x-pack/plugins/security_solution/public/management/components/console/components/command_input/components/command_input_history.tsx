/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import { EuiSelectable } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { InputHistoryItem } from '../../console_state/types';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useWithInputTextEntered } from '../../../hooks/state_selectors/use_with_input_text_entered';
import { UserCommandInput } from '../../user_command_input';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithInputHistory } from '../../../hooks/state_selectors/use_with_input_history';
import { useDataTestSubj } from '../../../hooks/state_selectors/use_data_test_subj';

const NO_HISTORY_EMPTY_MESSAGE = i18n.translate(
  'xpack.securitySolution.commandInputHistory.noHistoryEmptyMessage',
  { defaultMessage: 'No commands have been entered' }
);

export const CommandInputHistory = memo(() => {
  const dispatch = useConsoleStateDispatch();
  const inputHistory = useWithInputHistory();
  const [priorInputState] = useState(useWithInputTextEntered());
  const optionWasSelected = useRef(false);
  const getTestId = useTestIdGenerator(useDataTestSubj());

  const selectableHistoryOptions = useMemo(() => {
    return inputHistory.map<EuiSelectableProps['options'][number]>((inputItem, index) => {
      return {
        label: inputItem.input,
        key: inputItem.id,
        data: inputItem,
      };
    });
  }, [inputHistory]);

  const selectableListProps: EuiSelectableProps['listProps'] = useMemo(() => {
    return {
      showIcons: false,
      onKeyDownCapture: (ev) => {
        // Works around an issue where the `enter` key event from the EuiSelectable gets capture
        // by the outer `KeyCapture` input somehow. Likely due to the sequence of events between
        // keyup, focus and the Focus trap component having the `returnFocus` on by default
        if (ev.key === 'Enter') {
          // @ts-expect-error
          ev._CONSOLE_IGNORE_KEY = true;
        }
      },
    };
  }, []);

  const renderSelectionContent: EuiSelectableProps['children'] = useCallback((list, search) => {
    return list;
  }, []);

  const handleSelectableOnChange: EuiSelectableProps['onChange'] = useCallback(
    (items: EuiSelectableOption[]) => {
      optionWasSelected.current = true;

      const selected = items.find((item) => item.checked === 'on');

      dispatch({ type: 'updateInputPopoverState', payload: { show: undefined } });
      dispatch({ type: 'updateInputPlaceholderState', payload: { placeholder: '' } });

      if (selected) {
        dispatch({ type: 'updateInputTextEnteredState', payload: { textEntered: selected.label } });
      }

      dispatch({ type: 'addFocusToKeyCapture' });
    },
    [dispatch]
  );

  const handleOnActiveOptionChange: EuiSelectableProps['onActiveOptionChange'] = useCallback(
    (option) => {
      if (option) {
        dispatch({
          type: 'updateInputPlaceholderState',
          payload: {
            placeholder: (option.data as InputHistoryItem).input,
          },
        });
      }
    },
    [dispatch]
  );

  const handleRenderOption = useCallback((option) => {
    return <UserCommandInput input={option.label} />;
  }, []);

  // When first loaded, clear out the current text entered, and when this component
  // unloads, if no option from the history was selected, then set the prior text
  // entered back
  useEffect(() => {
    dispatch({ type: 'updateInputTextEnteredState', payload: { textEntered: '' } });

    return () => {
      if (!optionWasSelected.current) {
        dispatch({
          type: 'updateInputTextEnteredState',
          payload: {
            textEntered: priorInputState.textEntered,
            rightOfCursor: priorInputState.rightOfCursor,
          },
        });
        dispatch({ type: 'updateInputPlaceholderState', payload: { placeholder: '' } });
      }
    };
  }, [dispatch, optionWasSelected, priorInputState]);

  return (
    <EuiSelectable
      options={selectableHistoryOptions}
      onChange={handleSelectableOnChange}
      onActiveOptionChange={handleOnActiveOptionChange}
      renderOption={handleRenderOption}
      listProps={selectableListProps}
      singleSelection={true}
      emptyMessage={NO_HISTORY_EMPTY_MESSAGE}
      data-test-subj={getTestId('inputHistorySelector')}
    >
      {renderSelectionContent}
    </EuiSelectable>
  );
});
CommandInputHistory.displayName = 'CommandInputHistory';
