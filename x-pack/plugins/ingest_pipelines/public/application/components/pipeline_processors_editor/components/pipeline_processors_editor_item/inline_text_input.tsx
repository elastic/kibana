/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { FunctionComponent, useState, useEffect, useCallback } from 'react';
import { EuiFieldText, EuiText, keyCodes } from '@elastic/eui';

export interface Props {
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  text?: string;
}

export const InlineTextInput: FunctionComponent<Props> = ({
  placeholder,
  text,
  ariaLabel,
  onChange,
}) => {
  const [isShowingTextInput, setIsShowingTextInput] = useState<boolean>(false);
  const [textValue, setTextValue] = useState<string>(text ?? '');

  const content = isShowingTextInput ? (
    <EuiFieldText
      controlOnly
      fullWidth
      compressed
      value={textValue}
      aria-label={ariaLabel}
      className="pipelineProcessorsEditor__item__textInput"
      inputRef={(el) => el?.focus()}
      onChange={(event) => setTextValue(event.target.value)}
    />
  ) : (
    <EuiText size="s" color="subdued">
      {text || <em>{placeholder}</em>}
    </EuiText>
  );

  const submitChange = useCallback(() => {
    setIsShowingTextInput(false);
    onChange(textValue);
  }, [setIsShowingTextInput, onChange, textValue]);

  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (event.keyCode === keyCodes.ESCAPE || event.code === 'Escape') {
        setIsShowingTextInput(false);
      }
      if (event.keyCode === keyCodes.ENTER || event.code === 'Enter') {
        submitChange();
      }
    };
    if (isShowingTextInput) {
      window.addEventListener('keyup', keyboardListener);
    }
    return () => {
      window.removeEventListener('keyup', keyboardListener);
    };
  }, [isShowingTextInput, submitChange, setIsShowingTextInput]);

  return (
    <div
      className="pipelineProcessorsEditor__item__textContainer"
      tabIndex={0}
      onFocus={() => setIsShowingTextInput(true)}
      onBlur={submitChange}
    >
      {content}
    </div>
  );
};
