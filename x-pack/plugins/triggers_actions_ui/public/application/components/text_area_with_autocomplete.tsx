/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useCallback } from 'react';
import getCaretCoordinates from 'textarea-caret';
import {
  EuiTextArea,
  EuiFormRow,
  EuiSelectable,
  EuiSelectableOption,
  EuiPortal,
  EuiHighlight,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import './add_message_variables.scss';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import { filterSuggestions } from '../lib/filter_suggestions_for_autocomplete';
import { AddMessageVariables } from './add_message_variables';
import { templateActionVariable } from '../lib';

interface Props {
  editAction: (property: string, value: any, index: number) => void;
  errors?: string[];
  index: number;
  inputTargetValue?: string;
  isDisabled?: boolean;
  label: string;
  messageVariables?: ActionVariable[];
  paramsProperty: string;
}

export const TextAreaWithAutocomplete: React.FunctionComponent<Props> = ({
  editAction,
  errors,
  index,
  inputTargetValue,
  isDisabled = false,
  label,
  messageVariables,
  paramsProperty,
}) => {
  const [matches, setMatches] = useState<string[]>([]);
  const textAreaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const selectableRef = React.useRef<EuiSelectable | null>(null);
  const [caretPosition, setCaretPosition] = useState({ top: 0, left: 0, height: 0, width: 0 });
  const [isListOpen, setListOpen] = useState(false);
  const [selectableHasFocus, setSelectableHasFocus] = useState(false);
  const [searchWord, setSearchWord] = useState<string | null>(null);
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

  const onChangeWithMessageVariable = useCallback(() => {
    if (!textAreaRef.current) return;
    const { value, selectionStart } = textAreaRef.current;

    window.setTimeout(() => {
      if (textAreaRef.current) {
        const newCaretPosition = getCaretCoordinates(
          textAreaRef.current,
          textAreaRef.current.selectionStart
        );

        const textAreaClientRect = textAreaRef.current?.getBoundingClientRect();

        setCaretPosition({
          top:
            textAreaClientRect.top -
            textAreaRef.current.scrollTop +
            newCaretPosition?.top +
            newCaretPosition.height +
            window.pageYOffset,
          left: textAreaClientRect.left + window.pageXOffset,
          height: newCaretPosition.height,
          width: textAreaClientRect.width,
        });
      }
    }, 0);

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
  }, [editAction, index, messageVariables, paramsProperty]);

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
          />
        </EuiOutsideClickDetector>
        {matches.length > 0 && isListOpen && (
          <EuiPortal>
            <EuiSelectable
              ref={selectableRef}
              style={{
                position: 'absolute',
                top: caretPosition.top,
                width: caretPosition.width,
                left: caretPosition.left,
                border: '1px solid rgb(211, 218, 230)',
                background: '#fbfcfd',
                zIndex: 3000,
              }}
              height={matches.length > 5 ? 32 * 5.5 : matches.length * 32}
              options={optionsToShow}
              onChange={onOptionPick}
              singleSelection
              renderOption={renderSelectableOption}
              listProps={{ className: 'euiSelectableMsgAutoComplete' }}
            >
              {(list) => list}
            </EuiSelectable>
          </EuiPortal>
        )}
      </>
    </EuiFormRow>
  );
};
