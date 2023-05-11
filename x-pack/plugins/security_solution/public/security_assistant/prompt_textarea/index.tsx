/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiTextArea } from '@elastic/eui';
import React, { useCallback, useEffect } from 'react';

import styled from 'styled-components';
import * as i18n from './translations';

export interface Props {
  value: string;
  onSubmit: (value: string) => void;
  handlePromptChange?: (value: string) => void;
}

const StyledTextArea = styled(EuiTextArea)`
  min-height: 125px;
`;

export const PromptTextArea: React.FC<Props> = React.memo(
  ({ value, onSubmit, handlePromptChange }) => {
    const [currentValue, setCurrentValue] = React.useState(value);

    const onChangeCallback = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setCurrentValue(event.target.value);
        if (handlePromptChange) {
          handlePromptChange(event.target.value);
        }
      },
      [handlePromptChange]
    );

    const onKeyDown = useCallback(
      (event) => {
        if (event.key === 'Enter' && !event.shiftKey) {
          event.preventDefault();
          onSubmit(event.target.value?.trim());
          setCurrentValue('');
        }
      },
      [onSubmit]
    );

    useEffect(() => {
      setCurrentValue(value);
      // TODO: Future bug either way :)
      // if (handlePromptChange) {
      //   handlePromptChange(value);
      // }
    }, [value]);

    return (
      <StyledTextArea
        id={'prompt-textarea'}
        data-test-subj={'prompt-textarea'}
        fullWidth
        autoFocus
        placeholder={i18n.PROMPT_PLACEHOLDER}
        value={currentValue}
        onChange={onChangeCallback}
        onKeyDown={onKeyDown}
      />
    );
  }
);
PromptTextArea.displayName = 'PromptTextArea';
