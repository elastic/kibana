/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EuiSelectable, EuiSelectableOption, EuiSelectableProps } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { useWithInputTextEntered } from '../../../hooks/state_selectors/use_with_input_text_entered';
import { useIsMounted } from '../../../../../hooks/use_is_mounted';
import { UserCommandInput } from '../../user_command_input';
import { useConsoleStateDispatch } from '../../../hooks/state_selectors/use_console_state_dispatch';
import { useWithInputHistory } from '../../../hooks/state_selectors/use_with_input_history';
import { useDataTestSubj } from '../../../hooks/state_selectors/use_data_test_subj';

const NO_HISTORY_EMPTY_MESSAGE = i18n.translate(
  'xpack.securitySolution.commandInputHistory.noHistoryEmptyMessage',
  { defaultMessage: 'No commands have been entered' }
);

export const CommandInputHistory = memo(() => {
  const isMounted = useIsMounted();
  const dispatch = useConsoleStateDispatch();
  const inputHistory = useWithInputHistory();
  const [priorInputText] = useState(useWithInputTextEntered());
  const optionWasSelected = useRef(false);
  const getTestId = useTestIdGenerator(useDataTestSubj());
  const hasInputHistory = inputHistory.length > 0;

  const optionListRef = useRef(); // TODO:PT remove when https://github.com/elastic/eui/pull/5978 becomes available in kibana (task #4179)

  const selectableHistoryOptions = useMemo(() => {
    return inputHistory.map<EuiSelectableProps['options'][number]>((inputItem, index) => {
      return {
        label: inputItem.input,
        key: inputItem.id,
        'data-input': inputItem.input, // TODO:PT remove when https://github.com/elastic/eui/pull/5978 becomes available in kibana (task #4179)
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
      windowProps: {
        outerRef: optionListRef, // TODO:PT remove when https://github.com/elastic/eui/pull/5978 becomes available in kibana (task #4179)
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

  const handleRenderOption = useCallback((option) => {
    return <UserCommandInput input={option.label} />;
  }, []);

  // TODO:PT remove when https://github.com/elastic/eui/pull/5978 becomes available in kibana (task #4179)
  const [checkObserverTrigger, setCheckObserverTrigger] = useState(1);

  // TODO:PT remove when https://github.com/elastic/eui/pull/5978 becomes available in kibana (task #4179)
  useEffect(() => {
    if (!hasInputHistory) {
      return;
    }

    let observer: MutationObserver;

    if (optionListRef.current) {
      observer = new MutationObserver((mutationList) => {
        const focusedOption = mutationList.find((mutatedEl) =>
          (mutatedEl.target as HTMLLIElement).classList.contains('euiSelectableListItem-isFocused')
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
  }, [checkObserverTrigger, dispatch, hasInputHistory, isMounted]);

  // When first loaded, clear out the current text entered, and when this component
  // unloads, if no option from the history was selected, then set the prior text
  // entered back
  useEffect(() => {
    dispatch({ type: 'updateInputTextEnteredState', payload: { textEntered: '' } });

    return () => {
      if (!optionWasSelected.current) {
        dispatch({ type: 'updateInputTextEnteredState', payload: { textEntered: priorInputText } });
        dispatch({ type: 'updateInputPlaceholderState', payload: { placeholder: '' } });
      }
    };
  }, [dispatch, optionWasSelected, priorInputText]);

  return (
    <EuiSelectable
      options={selectableHistoryOptions}
      onChange={handleSelectableOnChange}
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
