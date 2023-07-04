/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useRef, useCallback } from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
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

interface Props {
  messageVariables?: ActionVariable[];
  paramsProperty: string;
  index: number;
  inputTargetValue?: string;
  isDisabled?: boolean;
  editAction: (property: string, value: any, index: number) => void;
  label: string;
  errors?: string[];
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
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectableRef = useRef<EuiSelectable | null>(null);
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
      const { value, selectionStart } = textAreaRef.current; // check for selectionEnd, should be when the start is?
      const lastCloseBracketIndex = value.slice(0, selectionStart).lastIndexOf(' ');
      const lastDoubleCurlyBracket = value.slice(0, selectionStart).lastIndexOf('{{');
      const currentWordStartIndex = Math.max(lastCloseBracketIndex, lastDoubleCurlyBracket);

      const checkedElement = newOptions.find(({ checked }) => checked === 'on');
      if (checkedElement) {
        const newInputText =
          value.slice(0, currentWordStartIndex) +
          '{{' +
          checkedElement.label +
          '}}' +
          value.slice(selectionStart);

        editAction(paramsProperty, newInputText, index);
        setMatches([]);
        textAreaRef.current.focus();
      }
    },
    [editAction, index, paramsProperty]
  );

  const onChangeWithMessageVariable = useCallback(() => {
    if (!textAreaRef.current) return;
    const { value, selectionStart } = textAreaRef.current; // check for selectionEnd, should be when the start is?

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

    const lastCloseBracketIndex = value.slice(0, selectionStart).lastIndexOf(' ');
    const lastDoubleCurlyBracket = value.slice(0, selectionStart).lastIndexOf('{{');
    const currentWordStartIndex = Math.max(lastCloseBracketIndex, lastDoubleCurlyBracket);

    const currentWord = value
      .slice(currentWordStartIndex === -1 ? 0 : currentWordStartIndex, selectionStart)
      .trim();
    if (currentWord.startsWith('{{')) {
      const filteredMatches = filterSuggestions({
        actionVariablesList: messageVariables?.map(({ name }) => name),
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

  const renderSelectableOption = (option: any) => {
    if (searchWord) {
      return <EuiHighlight search={searchWord}>{option.label}</EuiHighlight>;
    }
    return option.label;
  };

  return (
    <EuiFormRow
      fullWidth
      error={errors}
      isDisabled={isDisabled}
      isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
      label={label}
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
            onFocus={() => setListOpen(true)}
            onKeyDown={textareaOnKeyPress}
            onBlur={() => {
              if (!inputTargetValue && !isListOpen) {
                editAction(paramsProperty, '', index);
              }
            }}
            onClick={() => setListOpen(false)}
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
