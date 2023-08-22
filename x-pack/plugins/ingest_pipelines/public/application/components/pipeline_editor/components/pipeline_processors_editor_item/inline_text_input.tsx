/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import classNames from 'classnames';
import React, { useState, useEffect, useCallback, memo } from 'react';
import { EuiFieldText, EuiText, keys, EuiToolTip } from '@elastic/eui';

export interface Props {
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  /**
   * Whether the containing element of the text input can be focused.
   *
   * If it cannot be focused, this component cannot switch to showing
   * the text input field.
   *
   * Defaults to false.
   */
  disabled?: boolean;
  text?: string;
}

function _InlineTextInput({
  placeholder,
  text,
  ariaLabel,
  disabled = false,
  onChange,
}: Props): React.ReactElement<any, any> | null {
  const [isShowingTextInput, setIsShowingTextInput] = useState<boolean>(false);
  const [textValue, setTextValue] = useState<string>(() => text ?? '');

  const containerClasses = classNames('pipelineProcessorsEditor__item__textContainer', {
    'pipelineProcessorsEditor__item__textContainer--notEditing': !isShowingTextInput && !disabled,
  });

  const submitChange = useCallback(() => {
    // Give any on blur handlers the chance to complete if the user is
    // tabbing over this component.
    setTimeout(() => {
      setIsShowingTextInput(false);
      onChange(textValue);
    });
  }, [setIsShowingTextInput, onChange, textValue]);

  useEffect(() => {
    setTextValue(text ?? '');
  }, [text]);

  useEffect(() => {
    const keyboardListener = (event: KeyboardEvent) => {
      if (event.key === keys.ESCAPE || event.code === 'Escape') {
        setIsShowingTextInput(false);
      }
      if (event.key === keys.ENTER || event.code === 'Enter') {
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

  return isShowingTextInput && !disabled ? (
    <div className={`pipelineProcessorsEditor__item__textContainer ${containerClasses}`}>
      <EuiFieldText
        controlOnly
        onBlur={submitChange}
        fullWidth
        compressed
        value={textValue}
        aria-label={ariaLabel}
        className="pipelineProcessorsEditor__item__textInput"
        inputRef={(el) => el?.focus()}
        onChange={(event) => setTextValue(event.target.value)}
      />
    </div>
  ) : (
    <div
      className={containerClasses}
      tabIndex={disabled ? -1 : 0}
      onFocus={() => setIsShowingTextInput(true)}
    >
      <EuiToolTip content={text ?? placeholder}>
        <EuiText size="s" color="subdued">
          <div
            className="pipelineProcessorsEditor__item__description"
            data-test-subj="inlineTextInputNonEditableText"
          >
            {text || <em>{placeholder}</em>}
          </div>
        </EuiText>
      </EuiToolTip>
    </div>
  );
}

export const InlineTextInput = memo(_InlineTextInput);
