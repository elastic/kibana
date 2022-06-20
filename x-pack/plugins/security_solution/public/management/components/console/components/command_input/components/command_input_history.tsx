/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiSelectable, EuiSelectableProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useWithInputTextEntered } from '../../../hooks/state_selectors/use_with_input_text_entered';
import { useIsMounted } from '../../../../../hooks/use_is_mounted';
import { UserCommandInput } from '../../user_command_input';
import { InputHistoryItem } from '../../console_state/types';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithInputHistory } from '../../../hooks/state_selectors/use_with_input_history';

const NO_HISTORY_EMPTY_MESSAGE = i18n.translate(
  'xpack.securitySolution.commandInputHistory.noHistoryEmptyMessage',
  { defaultMessage: 'No commands have been entered' }
);

export const CommandInputHistory = memo(() => {
  const isMounted = useIsMounted();
  const dispatch = useConsoleStateDispatch();
  const inputHistory = useWithInputHistory();
  const [priorInputText] = useState(useWithInputTextEntered());
  const [optionWasSelected, setOptionWasSelected] = useState(false);

  const optionListRef = useRef(); // TODO:PT remove when https://github.com/elastic/eui/pull/5978 becomes available in kibana (task #4179)

  const selectableHistoryOptions = useMemo<EuiSelectableProps['options']>(() => {
    return inputHistory.map<EuiSelectableProps['options'][number]>((inputItem, index) => {
      return {
        label: inputItem.input,
        key: inputItem.id,
        'data-input': inputItem.input, // TODO:PT remove when https://github.com/elastic/eui/pull/5978 becomes available in kibana (task #4179)
      };
    });
  }, [inputHistory]);

  const selectableListProps: EuiSelectableProps<InputHistoryItem>['listProps'] = useMemo(() => {
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
      windowProps: {
        outerRef: optionListRef, // TODO:PT remove when https://github.com/elastic/eui/pull/5978 becomes available in kibana (task #4179)
      },
    };
  }, []);

  const renderAsIs: EuiSelectableProps<InputHistoryItem>['children'] = useCallback((list) => {
    return list;
  }, []);

  const handleSelectableOnChange: EuiSelectableProps<InputHistoryItem>['onChange'] = useCallback(
    (items) => {
      setOptionWasSelected(() => true);

      const selected = items.find((item) => item.checked === 'on');

      dispatch({ type: 'updateInputPopoverState', payload: { show: undefined } });
      dispatch({
        type: 'updateInputPlaceholderState',
        payload: { placeholder: '' },
      });

      if (selected) {
        dispatch({ type: 'updateInputTextEnteredState', payload: { textEntered: selected.label } });
      }

      dispatch({ type: 'addFocusToKeyCapture' });
    },
    [dispatch]
  );

  const handleRenderOption = useCallback((option) => {
    return <UserCommandInput input={option.label} />;
  }, []);

  // TODO:PT remove when https://github.com/elastic/eui/pull/5978 becomes available in kibana (task #4179)
  const [checkObserverTrigger, setCheckObserverTrigger] = useState(1);

  // TODO:PT remove when https://github.com/elastic/eui/pull/5978 becomes available in kibana (task #4179)
  useEffect(() => {
    let observer: MutationObserver;

    if (optionListRef.current) {
      observer = new MutationObserver((mutationList) => {
        const focusedOption = mutationList.find((mutatedEl) =>
          mutatedEl.target.classList.contains('euiSelectableListItem-isFocused')
        );

        if (focusedOption) {
          dispatch({
            type: 'updateInputPlaceholderState',
            payload: {
              placeholder: (focusedOption.target as HTMLLIElement).dataset.input as string,
            },
          });
        }
      });

      observer.observe(optionListRef.current, {
        attributes: true,
        subtree: true,
      });
    } else {
      setTimeout(() => {
        if (isMounted) {
          setCheckObserverTrigger(checkObserverTrigger + 1);
        }
      }, 5);
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  }, [checkObserverTrigger, dispatch, isMounted]);

  // When first loaded, clear out the current text entered, and when this component
  // unloads, if no option from the history was selcted, then set the prior text
  // entered back
  useEffect(() => {
    dispatch({ type: 'updateInputTextEnteredState', payload: { textEntered: '' } });

    return () => {
      if (!optionWasSelected) {
        dispatch({ type: 'updateInputTextEnteredState', payload: { textEntered: priorInputText } });
      }
    };
  }, [dispatch, optionWasSelected, priorInputText]);

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
