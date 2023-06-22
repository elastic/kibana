/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useMemo, useRef } from 'react';
import { EuiTextArea, EuiFormRow, EuiSelectable, EuiSelectableOption } from '@elastic/eui';
import './add_message_variables.scss';
import { ActionVariable } from '@kbn/alerting-plugin/common';
import getCaretCoordinates from 'textarea-caret';

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
  const parentRef = useRef<any>(null);
  const [caretPosition, setCaretPosition] = useState({ top: 0, left: 0, height: 0 });
  const [isListOpen, setListOpen] = useState(false);

  const optionsToShow: EuiSelectableOption[] = useMemo(() => {
    return matches?.map((variable) => ({
      label: variable,
      data: {
        description: variable,
      },
      'data-test-subj': `${variable}-selectableOption`,
    }));
  }, [matches]);

  const onChangeWithMessageVariable = () => {
    if (!textAreaRef.current) return;
    const { value, selectionStart } = textAreaRef.current; // check for selectionEnd, should be when the start is?

    const newCaretPosition = getCaretCoordinates(
      textAreaRef.current,
      textAreaRef.current.selectionStart
    );

    const parentTop = parentRef.current?.getBoundingClientRect().top;
    const top = textAreaRef.current?.getBoundingClientRect().top;

    setCaretPosition({
      top: top + newCaretPosition?.top + newCaretPosition.height - parentTop,
      left: newCaretPosition.left,
      height: newCaretPosition.height,
    });

    const lastCloseBracketIndex = value.slice(0, selectionStart).lastIndexOf(' ');
    const lastDoubleCurlyBracket = value.slice(0, selectionStart).lastIndexOf('{{');
    const currentWordStartIndex = Math.max(lastCloseBracketIndex, lastDoubleCurlyBracket);

    const currentWord = value
      .slice(currentWordStartIndex === -1 ? 0 : currentWordStartIndex, selectionStart)
      .trim();
    if (currentWord.startsWith('{{')) {
      const filteredMatches = filterSuggestions(suggestions, currentWord.slice(2));
      setMatches(filteredMatches);
    } else {
      setMatches([]);
    }

    editAction(paramsProperty, value, index);
  };

  const onOptionPick = (newOptions: EuiSelectableOption[]) => {
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
  };

  return (
    <div style={{ position: 'relative' }} ref={parentRef}>
      <EuiFormRow
        fullWidth
        error={errors}
        isDisabled={isDisabled}
        isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
        label={label}
      >
        <EuiTextArea
          disabled={isDisabled}
          inputRef={textAreaRef}
          fullWidth
          isInvalid={errors && errors.length > 0 && inputTargetValue !== undefined}
          name={paramsProperty}
          value={inputTargetValue || ''}
          data-test-subj={`${paramsProperty}TextArea`}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChangeWithMessageVariable(e)}
          onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
            setListOpen(true);
          }}
          // onKeyDown={}
          // onMouseLeave={}
          // onMouseOut={}
          onWheel={() => {
            // setListOpen(false);
          }}
          onBlur={() => {
            // setListOpen(false);
            if (!inputTargetValue) {
              editAction(paramsProperty, '', index);
            }
          }}
        />
      </EuiFormRow>
      {matches.length > 0 && isListOpen && (
        <EuiSelectable
          style={{
            position: 'absolute',
            top: caretPosition.top,
            width: '100%',
            border: '1px solid rgb(211, 218, 230)',
            background: '#fbfcfd',
          }}
          options={optionsToShow}
          onChange={onOptionPick}
          singleSelection
        >
          {(list) => list}
        </EuiSelectable>
      )}
    </div>
  );
};
