/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { i18n } from '@kbn/i18n';
import { EuiFieldText, EuiFormControlLayout, useEuiTheme } from '@elastic/eui';

const INPUT_HEIGHT = 56;

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
  const { euiTheme } = useEuiTheme();
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value);

  return (
    <EuiFormControlLayout
      // EUI Override: css property has less priority than basic styles
      style={{
        height: INPUT_HEIGHT,
      }}
      fullWidth
    >
      <EuiFieldText
        // EUI Override: css property has less priority than basic styles
        style={{
          height: INPUT_HEIGHT,
          paddingRight: euiTheme.size.xxxxl,
        }}
        controlOnly
        fullWidth
        placeholder={i18n.translate(
          'xpack.searchPlayground.chat.questionInput.askQuestionPlaceholder',
          {
            defaultMessage: 'Ask a question',
          }
        )}
        value={value}
        onChange={handleChange}
        disabled={isDisabled}
      />

      <div
        css={{
          position: 'absolute',
          right: euiTheme.size.base,
          top: euiTheme.size.m,
        }}
      >
        {button}
      </div>
    </EuiFormControlLayout>
  );
};
