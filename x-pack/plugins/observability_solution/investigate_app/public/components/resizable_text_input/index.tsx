/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiTextArea, keys } from '@elastic/eui';
import { css } from '@emotion/css';
import React, { useCallback, useEffect, useRef } from 'react';

interface Props {
  placeholder: string;
  disabled: boolean;
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function ResizableTextInput({ disabled, value, onChange, onSubmit, placeholder }: Props) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleResizeTextArea();

    onChange(event.target.value);
  };

  const handleResizeTextArea = useCallback(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.minHeight = 'auto';

      const cappedHeight = Math.min(textAreaRef.current?.scrollHeight, 350);

      textAreaRef.current.style.minHeight = cappedHeight + 'px';
    }
  }, []);

  useEffect(() => {
    const textarea = textAreaRef.current;

    if (textarea) {
      textarea.focus();
    }
  }, []);

  useEffect(() => {
    handleResizeTextArea();
  }, [handleResizeTextArea]);

  useEffect(() => {
    if (value === undefined) {
      handleResizeTextArea();
    }
  }, [handleResizeTextArea, value]);

  return (
    <EuiTextArea
      data-test-subj="investigateAppResizableTextInputTextArea"
      className={css`
        max-height: 200;
        padding: 8px 12px;
      `}
      disabled={disabled}
      fullWidth
      inputRef={textAreaRef}
      placeholder={placeholder}
      resize="vertical"
      rows={4}
      value={value}
      onChange={handleChange}
      onKeyDown={(event) => {
        if (!event.shiftKey && event.key === keys.ENTER) {
          event.preventDefault();
          onSubmit();
        }
      }}
    />
  );
}
