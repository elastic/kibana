/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLink,
  EuiPanel,
  EuiTabbedContent,
  EuiTextArea,
} from '@elastic/eui';
import React, { useMemo, useCallback, ChangeEvent } from 'react';
import styled, { css } from 'styled-components';

import { Markdown } from '../markdown';
import * as i18n from './translations';
import { MARKDOWN_HELP_LINK } from './constants';

const TextArea = styled(EuiTextArea)`
  width: 100%;
`;

const Container = styled(EuiPanel)`
  ${({ theme }) => css`
    padding: 0;
    background: ${theme.eui.euiColorLightestShade};
    position: relative;
    .markdown-tabs-header {
      position: absolute;
      top: ${theme.eui.euiSizeS};
      right: ${theme.eui.euiSizeS};
      z-index: ${theme.eui.euiZContentMenu};
    }
    .euiTab {
      padding: 10px;
    }
    .markdown-tabs {
      width: 100%;
    }
    .markdown-tabs-footer {
      height: 41px;
      padding: 0 ${theme.eui.euiSizeM};
      .euiLink {
        font-size: ${theme.eui.euiSizeM};
      }
    }
    .euiFormRow__labelWrapper {
      position: absolute;
      top: -${theme.eui.euiSizeL};
    }
    .euiFormErrorText {
      padding: 0 ${theme.eui.euiSizeM};
    }
  `}
`;

const MarkdownContainer = styled(EuiPanel)`
  min-height: 150px;
  overflow: auto;
`;

export interface CursorPosition {
  start: number;
  end: number;
}

/** An input for entering a new case description  */
export const MarkdownEditor = React.memo<{
  bottomRightContent?: React.ReactNode;
  topRightContent?: React.ReactNode;
  content: string;
  isDisabled?: boolean;
  onChange: (description: string) => void;
  onClickTimeline?: (timelineId: string) => void;
  onCursorPositionUpdate?: (cursorPosition: CursorPosition) => void;
  placeholder?: string;
}>(
  ({
    bottomRightContent,
    topRightContent,
    content,
    isDisabled = false,
    onChange,
    onClickTimeline,
    placeholder,
    onCursorPositionUpdate,
  }) => {
    const handleOnChange = useCallback(
      (evt: ChangeEvent<HTMLTextAreaElement>) => {
        onChange(evt.target.value);
      },
      [onChange]
    );

    const setCursorPosition = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (onCursorPositionUpdate) {
        onCursorPositionUpdate({
          start: e!.target!.selectionStart ?? 0,
          end: e!.target!.selectionEnd ?? 0,
        });
      }
      return false;
    };

    const tabs = useMemo(
      () => [
        {
          id: 'comment',
          name: i18n.MARKDOWN,
          content: (
            <TextArea
              data-test-subj="textAreaInput"
              onChange={handleOnChange}
              onBlur={setCursorPosition}
              aria-label={`markdown-editor-comment`}
              fullWidth={true}
              disabled={isDisabled}
              placeholder={placeholder ?? ''}
              spellCheck={false}
              value={content}
            />
          ),
        },
        {
          id: 'preview',
          name: i18n.PREVIEW,
          'data-test-subj': 'preview-tab',
          content: (
            <MarkdownContainer data-test-subj="markdown-container" paddingSize="s">
              <Markdown raw={content} onClickTimeline={onClickTimeline} />
            </MarkdownContainer>
          ),
        },
      ],
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [content, isDisabled, placeholder]
    );
    return (
      <Container>
        {topRightContent && <div className={`markdown-tabs-header`}>{topRightContent}</div>}
        <EuiTabbedContent
          className={`markdown-tabs`}
          data-test-subj={`markdown-tabs`}
          size="s"
          tabs={tabs}
          initialSelectedTab={tabs[0]}
        />
        <EuiFlexGroup
          className={`markdown-tabs-footer`}
          alignItems="center"
          gutterSize="none"
          justifyContent="spaceBetween"
        >
          <EuiFlexItem grow={false}>
            <EuiLink href={MARKDOWN_HELP_LINK} external target="_blank">
              {i18n.MARKDOWN_SYNTAX_HELP}
            </EuiLink>
          </EuiFlexItem>
          {bottomRightContent && <EuiFlexItem grow={false}>{bottomRightContent}</EuiFlexItem>}
        </EuiFlexGroup>
      </Container>
    );
  }
);

MarkdownEditor.displayName = 'MarkdownEditor';
