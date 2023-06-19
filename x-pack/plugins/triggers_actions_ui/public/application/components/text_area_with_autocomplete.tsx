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
import { AddMessageVariables } from './add_message_variables';
import { templateActionVariable } from '../lib';

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
  const [currentTextElement, setCurrentTextElement] = useState<HTMLTextAreaElement | null>(null);
  const suggestions = convertArrayToObject(messageVariables?.map(({ name }) => name));
  const [matches, setMatches] = useState<string[]>([]);
  const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const parentRef = useRef<any>(null);
  const [caretPosition, setCaretPosition] = useState({ top: 0, left: 0, height: 0 });
  const optionsToShow: EuiSelectableOption[] = useMemo(() => {
    return matches?.map((variable) => ({
      label: variable,
      data: {
        description: variable,
      },
      'data-test-subj': `${variable}-selectableOption`,
    }));
  }, [matches]);

  const onSelectMessageVariable = (variable: ActionVariable) => {
    const templatedVar = templateActionVariable(variable);
    const startPosition = currentTextElement?.selectionStart ?? 0;
    const endPosition = currentTextElement?.selectionEnd ?? 0;
    const newValue =
      (inputTargetValue ?? '').substring(0, startPosition) +
      templatedVar +
      (inputTargetValue ?? '').substring(endPosition, (inputTargetValue ?? '').length);
    editAction(paramsProperty, newValue, index);
  };

  const onChangeWithMessageVariable = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const inputValue = event.target.value;

    if (textAreaRef.current) {
      const newCaretPosition =
        textAreaRef.current &&
        getCaretCoordinates(textAreaRef.current, textAreaRef.current.selectionStart);

      const top = textAreaRef.current?.getBoundingClientRect().top;

      setCaretPosition({
        top: top + newCaretPosition?.top + newCaretPosition.height,
        left: newCaretPosition.left,
        height: newCaretPosition.height,
      });
    }

    const lastOpenBracketIndex = inputValue.lastIndexOf('{{');
    const lastCloseBracketIndex = inputValue.lastIndexOf('}}');
    const lastBracketIndex = Math.max(lastOpenBracketIndex, lastCloseBracketIndex);

    if (lastBracketIndex !== -1 && lastOpenBracketIndex === lastBracketIndex) {
      const lastWord = inputValue.slice(lastBracketIndex + 2).trim();
      const filteredMatches = filterSuggestions(suggestions, lastWord);
      setMatches(filteredMatches);
    } else {
      setMatches([]);
    }
    editAction(paramsProperty, inputValue, index);
  };

  const onOptionPick = (newOptions: EuiSelectableOption[]) => {
    const lastOpenBracketIndex = inputTargetValue?.lastIndexOf('{{');
    const lastCloseBracketIndex = inputTargetValue?.lastIndexOf('}}');
    const lastBracketIndex = Math.max(lastOpenBracketIndex ?? 0, lastCloseBracketIndex ?? 0);

    const start = inputTargetValue?.slice(0, lastBracketIndex + 2);
    const words =
      inputTargetValue
        ?.slice(lastBracketIndex + 2)
        .trim()
        .split('.') || [];

    const checkedElement = newOptions.find(({ checked }) => checked === 'on');
    if (checkedElement) {
      words[words.length - 1] = checkedElement.label;
      const newInputText = start + words.join('.') + '}}';
      editAction(paramsProperty, newInputText, index);
      setMatches([]);
    }
  };

  return (
    <div style={{}} ref={parentRef}>
      <EuiFormRow
        fullWidth
        error={errors}
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
            setCurrentTextElement(e.target);
          }}
          onBlur={() => {
            if (!inputTargetValue) {
              editAction(paramsProperty, '', index);
            }
          }}
        />
      </EuiFormRow>
      {matches.length > 0 && (
        <EuiSelectable
          style={{
            position: 'fixed',
            top: caretPosition.top,
            width: 200,
            border: '2px solid grey',
            background: 'white',
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
