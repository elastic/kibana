/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';

import { i18n } from '@kbn/i18n';
import { EuiTextArea, keys, useEuiTheme } from '@elastic/eui';

const MAX_HEIGHT = 200;

interface QuestionInputProps {
  value: string;
  onChange: (value: string) => void;
  button: React.ReactNode;
  isDisabled?: boolean;
}

export const QuestionInput: React.FC<QuestionInputProps> = ({
  value,
  onChange,
  button,
  isDisabled,
}) => {
  const [isComposing, setIsComposing] = useState(false);
  const { euiTheme } = useEuiTheme();
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);

      e.target.style.height = 'auto';
      e.target.style.height = `${e.target.scrollHeight}px`;
    },
    [onChange]
  );
  const handleCompositionStart = () => setIsComposing(true);
  const handleCompositionEnd = () => {
    setIsComposing(false);
  };
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === keys.ENTER && !event.shiftKey && !isComposing) {
        event.preventDefault();

        event.currentTarget.form?.requestSubmit();
      }
    },
    [isComposing]
  );

  return (
    <div css={{ position: 'relative' }}>
      <EuiTextArea
        className="eui-scrollBar"
        style={{
          maxHeight: MAX_HEIGHT,
          lineHeight: euiTheme.size.l,
          padding: `${euiTheme.size.base} ${euiTheme.size.xxxxl} ${euiTheme.size.base} ${euiTheme.size.base}`,
        }}
        autoFocus
        fullWidth
        rows={1}
        placeholder={i18n.translate(
          'xpack.searchPlayground.chat.questionInput.askQuestionPlaceholder',
          {
            defaultMessage: 'Ask a question',
          }
        )}
        value={value}
        onKeyDown={handleKeyDown}
        onChange={handleChange}
        disabled={isDisabled}
        resize="none"
        data-test-subj="questionInput"
        onCompositionStart={handleCompositionStart}
        onCompositionEnd={handleCompositionEnd}
      />

      <div
        css={{
          position: 'absolute',
          right: euiTheme.size.base,
          bottom: euiTheme.size.m,
        }}
      >
        {button}
      </div>
    </div>
  );
};
