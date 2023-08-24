/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import getCaretCoordinates from 'textarea-caret';
import { Properties } from 'csstype';
import {
  EuiTextArea,
  EuiFormRow,
  EuiSelectable,
  EuiSelectableOption,
  EuiPortal,
  EuiHighlight,
  EuiOutsideClickDetector,
  useEuiTheme,
  useEuiBackgroundColor,
} from '@elastic/eui';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { AddMessageVariables } from '@kbn/alerts-ui-shared';
import { filterSuggestions } from '../lib/filter_suggestions_for_autocomplete';
import { templateActionVariable } from '../lib/template_action_variable';

export interface TextAreaWithAutocompleteProps {
  editAction: (property: string, value: any, index: number) => void;
  errors?: string[];
  index: number;
  inputTargetValue?: string;
  isDisabled?: boolean;
  label: string;
  messageVariables?: ActionVariable[];
  paramsProperty: string;
}
const selectableListProps = { className: 'euiSelectableMsgAutoComplete' };

export const TextAreaWithAutocomplete: React.FunctionComponent<TextAreaWithAutocompleteProps> = ({
  editAction,
  errors,
  index,
  inputTargetValue,
  isDisabled = false,
  label,
  messageVariables,
  paramsProperty,
}) => {
  const { euiTheme } = useEuiTheme();
  const backgroundColor = useEuiBackgroundColor('plain');

  const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const selectableRef = React.useRef<EuiSelectable | null>(null);

  const [matches, setMatches] = useState<string[]>([]);
  const [popupPosition, setPopupPosition] = useState({ top: 0, left: 0, height: 0, width: 0 });
  const [isListOpen, setListOpen] = useState(false);
  const [selectableHasFocus, setSelectableHasFocus] = useState(false);
  const [searchWord, setSearchWord] = useState<string>('');

  const optionsToShow: EuiSelectableOption[] = useMemo(() => {
    return matches?.map((variable) => ({
      label: variable,
      data: {
        description: variable,
      },
      'data-test-subj': `${variable}-selectableOption`,
    }));
  }, [matches]);

  const onOptionPick = useCallback(
    (newOptions: EuiSelectableOption[]) => {
      if (!textAreaRef.current) return;
      const { value, selectionStart, scrollTop } = textAreaRef.current;
      const lastSpaceIndex = value.slice(0, selectionStart).lastIndexOf(' ');
      const lastOpenDoubleCurlyBracketsIndex = value.slice(0, selectionStart).lastIndexOf('{{');
      const currentWordStartIndex = Math.max(lastSpaceIndex, lastOpenDoubleCurlyBracketsIndex);

      const checkedElement = newOptions.find(({ checked }) => checked === 'on');
      if (checkedElement) {
        const newInputText =
          value.slice(0, currentWordStartIndex) +
          '{{' +
          checkedElement.label +
          '}}' +
          value.slice(selectionStart);

        editAction(paramsProperty, newInputText.trim(), index);
        setMatches([]);
        textAreaRef.current.focus();
        // We use setTimeout here, because editAction is async function and we need to wait before it executes
        setTimeout(() => {
          if (textAreaRef.current) {
            textAreaRef.current.selectionStart =
              currentWordStartIndex + checkedElement.label.length + 4;
            textAreaRef.current.selectionEnd = textAreaRef.current.selectionStart;
            textAreaRef.current.scrollTop = scrollTop;
          }
        }, 0);
      }
    },
    [editAction, index, paramsProperty]
  );

  const recalcMenuPosition = useCallback(() => {
    if (!textAreaRef.current) return;
    const newPosition = getCaretCoordinates(
      textAreaRef.current,
      textAreaRef.current.selectionStart
    );
    const textAreaClientRect = textAreaRef.current?.getBoundingClientRect();

    const top =
      textAreaClientRect.top - textAreaRef.current.scrollTop + newPosition.top + newPosition.height;
    const left = textAreaClientRect.left + window.pageXOffset;
    const height = newPosition.height;
    const width = textAreaClientRect.width;
    setPopupPosition((old) =>
      old.top !== top || old.left !== left || old.width !== width || old.height !== height
        ? { top, left, width, height }
        : old
    );
  }, [setPopupPosition, textAreaRef]);

  useEffect(() => {
    if (!isListOpen) return;
    // E.g. we have a case, that warning appeared and disappeared from time to time, but without recalculation of
    // a menu position, a menu will be in a wrong place. To prevent such cases I recalculate a menu position every 300 ms.
    const interval = setInterval(recalcMenuPosition, 300);
    return () => clearInterval(interval);
  }, [isListOpen, recalcMenuPosition]);

  const onChangeWithMessageVariable = useCallback(() => {
    if (!textAreaRef.current) return;
    const { value, selectionStart } = textAreaRef.current;

    recalcMenuPosition();
    const lastSpaceIndex = value.slice(0, selectionStart).lastIndexOf(' ');
    const lastOpenDoubleCurlyBracketsIndex = value.slice(0, selectionStart).lastIndexOf('{{');
    const currentWordStartIndex = Math.max(lastSpaceIndex, lastOpenDoubleCurlyBracketsIndex);

    const currentWord = value
      .slice(currentWordStartIndex === -1 ? 0 : currentWordStartIndex, selectionStart)
      .trim();

    if (currentWord.startsWith('{{')) {
      const filteredMatches = filterSuggestions({
        actionVariablesList: messageVariables
          ?.filter(({ deprecated }) => !deprecated)
          .map(({ name }) => name),
        propertyPath: currentWord.slice(2),
      });
      setSearchWord(currentWord.slice(2));
      setMatches(filteredMatches);
      setListOpen((prevVal) => {
        if (!prevVal) {
          return true;
        }
        return prevVal;
      });
    } else {
      setMatches([]);
    }

    editAction(paramsProperty, value, index);
  }, [editAction, index, messageVariables, paramsProperty, recalcMenuPosition]);

  const textareaOnKeyPress = useCallback(
    (event) => {
      if (selectableRef.current && isListOpen) {
        if (!selectableHasFocus && (event.code === 'ArrowUp' || event.code === 'ArrowDown')) {
          event.preventDefault();
          event.stopPropagation();
          selectableRef.current.onFocus();
          setSelectableHasFocus(true);
        } else if (event.code === 'ArrowUp') {
          event.preventDefault();
          event.stopPropagation();
          selectableRef.current.incrementActiveOptionIndex(-1);
        } else if (event.code === 'ArrowDown') {
          event.preventDefault();
          event.stopPropagation();
          selectableRef.current.incrementActiveOptionIndex(1);
        } else if (event.code === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          setListOpen(false);
          setSelectableHasFocus(false);
        } else if (event.code === 'Enter' || event.code === 'Space') {
          const optionIndex = selectableRef.current.state.activeOptionIndex;
          onOptionPick(
            optionsToShow.map((ots, idx) => {
              if (idx === optionIndex) {
                return {
                  ...ots,
                  checked: 'on',
                };
              }
              return ots;
            })
          );
          setListOpen(false);
          setSelectableHasFocus(false);
        }
      } else {
        setSelectableHasFocus((prevValue) => {
          if (prevValue) {
            return false;
          }
          return prevValue;
        });
      }
    },
    [isListOpen, onOptionPick, optionsToShow, selectableHasFocus]
  );

  const clickOutSideTextArea = useCallback((event) => {
    const box = document
      .querySelector('.euiSelectableMsgAutoComplete')
      ?.getBoundingClientRect() || {
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
    };
    if (
      event.clientX > box.left &&
      event.clientX < box.right &&
      event.clientY > box.top &&
      event.clientY < box.bottom
    ) {
      return;
    }
    setListOpen(false);
  }, []);

  const onSelectMessageVariable = useCallback(
    (variable: ActionVariable) => {
      if (!textAreaRef.current) return;
      const { selectionStart: startPosition, selectionEnd: endPosition } = textAreaRef.current;
      const templatedVar = templateActionVariable(variable);

      const newValue =
        (inputTargetValue ?? '').substring(0, startPosition) +
        templatedVar +
        (inputTargetValue ?? '').substring(endPosition, (inputTargetValue ?? '').length);

      editAction(paramsProperty, newValue, index);
    },
    [editAction, index, inputTargetValue, paramsProperty]
  );

  const renderSelectableOption = (option: any) => {
    if (searchWord) {
      return <EuiHighlight search={searchWord}>{option.label}</EuiHighlight>;
    }
    return option.label;
  };

  const selectableStyle: Properties<string | number> = {
    position: 'absolute',
    top: popupPosition.top,
    width: popupPosition.width,
    left: popupPosition.left,
    border: `${euiTheme.border.width.thin} solid ${euiTheme.border.color}`,
    background: backgroundColor,
    zIndex: 3000,
  };

  return (
    <EuiFormRow
      error={errors}
      fullWidth
      isDisabled={isDisabled}
      isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
      label={label}
      labelAppend={
        <AddMessageVariables
          messageVariables={messageVariables}
          onSelectEventHandler={onSelectMessageVariable}
          paramsProperty={paramsProperty}
        />
      }
    >
      <>
        <EuiOutsideClickDetector onOutsideClick={clickOutSideTextArea}>
          <EuiTextArea
            disabled={isDisabled}
            inputRef={textAreaRef}
            fullWidth
            isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
            name={paramsProperty}
            value={inputTargetValue || ''}
            data-test-subj={`${paramsProperty}TextArea`}
            onChange={onChangeWithMessageVariable}
            onFocus={useCallback(() => setListOpen(true), [])}
            onKeyDown={textareaOnKeyPress}
            onBlur={useCallback(() => {
              if (!inputTargetValue && !isListOpen) {
                editAction(paramsProperty, '', index);
              }
            }, [editAction, index, inputTargetValue, isListOpen, paramsProperty])}
            onClick={useCallback(() => setListOpen(false), [])}
            onScroll={useCallback(() => {
              if (
                textAreaRef.current?.getBoundingClientRect() &&
                textAreaRef.current.getBoundingClientRect().top > popupPosition.top
              ) {
                setListOpen(false);
              }
            }, [popupPosition.top])}
          />
        </EuiOutsideClickDetector>
        {matches.length > 0 && isListOpen && (
          <EuiPortal>
            <EuiSelectable
              ref={selectableRef}
              style={selectableStyle}
              height={matches.length > 5 ? 32 * 5.5 : matches.length * 32}
              options={optionsToShow}
              onChange={onOptionPick}
              singleSelection
              renderOption={renderSelectableOption}
              listProps={selectableListProps}
            >
              {(list) => list}
            </EuiSelectable>
          </EuiPortal>
        )}
      </>
    </EuiFormRow>
  );
};

// eslint-disable-next-line import/no-default-export
export { TextAreaWithAutocomplete as default };
