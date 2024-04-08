/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import React, { KeyboardEvent, useCallback, useEffect, useRef, useState } from 'react';
import { css } from '@emotion/css';
import { EuiInputPopover, EuiSelectable, EuiTextArea } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { MessageRole } from '@kbn/observability-ai-assistant-plugin/public';
import type { Message } from '@kbn/observability-ai-assistant-plugin/common';

interface Props {
  disabled: boolean;
  prompt: string | undefined;
  previousPrompts: string[];
  onChange: (message: Message['message']) => void;
  onChangeHeight: (height: number) => void;
  onFocus: () => void;
  onBlur: () => void;
}

const inputPopoverClassName = css`
  max-inline-size: 100%;
`;

const textAreaClassName = css`
  max-height: 200px;
  width: 100%;
`;

const selectableClassName = css`
  .euiSelectableListItem__icon {
    display: none;
  }
`;

export function PromptEditorNaturalLanguage({
  disabled,
  prompt,
  previousPrompts,
  onChange,
  onChangeHeight,
  onFocus,
  onBlur,
}: Props) {
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const [isSelectablePopoverOpen, setSelectablePopoverOpen] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    handleResizeTextArea();

    onChange({
      role: MessageRole.User,
      content: event.currentTarget.value,
    });
  };

  const handleResizeTextArea = useCallback(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.minHeight = 'auto';

      const cappedHeight = Math.min(textAreaRef.current?.scrollHeight, 350);

      textAreaRef.current.style.minHeight = cappedHeight + 'px';

      onChangeHeight(cappedHeight);
    }
  }, [onChangeHeight]);

  const handleKeydown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // only trigger select when no prompt is available
    if (!prompt && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      setSelectablePopoverOpen(true);
    }
  };

  const handleSelectOption = (_: any, __: any, selectedOption: { label: string }) => {
    onChange({
      role: MessageRole.User,
      content: selectedOption.label,
    });
    setSelectablePopoverOpen(false);
    onFocus();
  };

  const handleClosePopover = () => {
    setSelectablePopoverOpen(false);
    onFocus();
  };

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
    if (prompt === undefined) {
      handleResizeTextArea();
    }
  }, [handleResizeTextArea, prompt]);

  return (
    <EuiInputPopover
      display="flex"
      isOpen={isSelectablePopoverOpen}
      closePopover={handleClosePopover}
      className={inputPopoverClassName}
      input={
        <EuiTextArea
          className={textAreaClassName}
          data-test-subj="observabilityAiAssistantChatPromptEditorTextArea"
          disabled={disabled}
          fullWidth
          inputRef={textAreaRef}
          placeholder={i18n.translate('xpack.observabilityAiAssistant.prompt.placeholder', {
            defaultMessage: 'Send a message to the Assistant',
          })}
          resize="vertical"
          rows={1}
          value={prompt || ''}
          onChange={handleChange}
          onFocus={onFocus}
          onKeyDown={handleKeydown}
          onBlur={onBlur}
        />
      }
      panelMinWidth={300}
      anchorPosition="downLeft"
    >
      <EuiSelectable
        aria-label={i18n.translate(
          'xpack.observabilityAiAssistant.promptEditorNaturalLanguage.euiSelectable.selectAnOptionLabel',
          { defaultMessage: 'Select an option' }
        )}
        className={selectableClassName}
        options={previousPrompts.map((label) => ({ label }))}
        searchable
        singleSelection
        onChange={handleSelectOption}
      >
        {(list, search) => (
          <>
            {search}
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiInputPopover>
  );
}
