/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useRef, useCallback, EventHandler } from 'react';
import getCaretCoordinates from 'textarea-caret';
import {
  EuiTextArea,
  EuiFormRow,
  EuiSelectable,
  EuiSelectableOption,
  EuiPortal,
  EuiOutsideClickDetector,
} from '@elastic/eui';
import './add_message_variables.scss';
import { ActionVariable } from '@kbn/alerting-plugin/common';

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

const convertArrayToObject = (arr?: string[]) => {
  if (!arr) return {};
  const result: any = {};

  for (const item of arr) {
    let currentObj = result;
    const keys = item.split('.');

    for (let i = 0; i < keys.length - 1; i++) {
      const key = keys[i];

      if (!currentObj[key]) {
        currentObj[key] = {};
      }

      currentObj = currentObj[key];
    }

    const lastKey = keys[keys.length - 1];
    currentObj[lastKey] = {};
  }

  return result;
};

const filterSuggestions = (obj: Record<string, unknown>, propertyPath: string) => {
  const keys = propertyPath.split('.');

  if (keys.length === 1) {
    return Object.keys(obj).filter((suggestion) =>
      suggestion.toLowerCase().startsWith(keys[0].toLowerCase())
    );
  }
  let currentObj: Record<string, unknown> = obj;

  for (const key of keys.slice(0, -1)) {
    currentObj = currentObj[key] as Record<string, unknown>;

    if (!currentObj) {
      return [];
    }
  }
  return Object.keys(currentObj).filter((suggestion) =>
    suggestion.toLowerCase().startsWith(keys[keys.length - 1].toLowerCase())
  );
};

export const TextAreaWithAutocomplete: React.FunctionComponent<Props> = ({
  messageVariables,
  paramsProperty,
  index,
  inputTargetValue,
  isDisabled = false,
  editAction,
  label,
  errors,
}) => {
  const suggestions = convertArrayToObject(messageVariables?.map(({ name }) => name));
  const [matches, setMatches] = useState<string[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const selectableRef = useRef<EuiSelectable | null>(null);
  const [caretPosition, setCaretPosition] = useState({ top: 0, left: 0, height: 0, width: 0 });
  const [isListOpen, setListOpen] = useState(false);
  const [selectableHasFocus, setSelectableHasFocus] = useState(false);

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

      const words = value
        .slice(currentWordStartIndex === -1 ? 0 : currentWordStartIndex + 2, selectionStart)
        .trim()
        .split('.');

      const checkedElement = newOptions.find(({ checked }) => checked === 'on');
      if (checkedElement) {
        words[words.length - 1] = checkedElement.label;
        const newInputText =
          value.slice(0, currentWordStartIndex) +
          '{{' +
          words.join('.') +
          '}}' +
          value.slice(selectionStart);
        editAction(paramsProperty, newInputText, index);
        setMatches([]);
      }
    },
    [editAction, index, paramsProperty]
  );

  const onChangeWithMessageVariable = () => {
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
      const filteredMatches = filterSuggestions(suggestions, currentWord.slice(2));
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
  };

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
    // TODO we need to use a class name directly (.euiSelectable), that's just the idea how to do it
    const box = document.querySelector('.euiSelectable')?.getBoundingClientRect() || {
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
            onChange={() => onChangeWithMessageVariable()}
            onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
              setListOpen(true);
            }}
            onKeyDown={textareaOnKeyPress}
            // onWheel={() => {
            //   setListOpen(false);
            // }}
            onBlur={() => {
              // setListOpen(false);
              if (!inputTargetValue && !isListOpen) {
                editAction(paramsProperty, '', index);
              }
            }}
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
              height={32 * 5.5}
              options={optionsToShow}
              onChange={onOptionPick}
              singleSelection={true}
            >
              {(list) => list}
            </EuiSelectable>
          </EuiPortal>
        )}
      </>
    </EuiFormRow>
  );
};
