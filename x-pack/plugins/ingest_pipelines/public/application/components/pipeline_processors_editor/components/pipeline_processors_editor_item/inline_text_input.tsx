/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import classNames from 'classnames';
import React, { FunctionComponent, useState, useEffect, useCallback } from 'react';
import { EuiFieldText, EuiText, keyCodes } from '@elastic/eui';

export interface Props {
  placeholder: string;
  ariaLabel: string;
  onChange: (value: string) => void;
  disabled: boolean;
  text?: string;
}

export const InlineTextInput: FunctionComponent<Props> = ({
  disabled,
  placeholder,
  text,
  ariaLabel,
  onChange,
}) => {
  const [isShowingTextInput, setIsShowingTextInput] = useState<boolean>(false);
  const [textValue, setTextValue] = useState<string>(text ?? '');

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
    <div className={containerClasses} tabIndex={0} onFocus={() => setIsShowingTextInput(true)}>
      <EuiText size="s" color="subdued">
        <div className="pipelineProcessorsEditor__item__description">
          {text || <em>{placeholder}</em>}
        </div>
      </EuiText>
    </div>
  );
};
