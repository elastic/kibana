/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButton } from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import styled, { css } from 'styled-components';

import { MarkdownEditor } from '../../../../components/markdown_editor';
import * as i18n from '../case_view/translations';
import { Markdown } from '../../../../components/markdown';

const ContentWrapper = styled.div`
  ${({ theme }) => css`
    padding: ${theme.eui.euiSizeM} ${theme.eui.euiSizeL};
  `}
`;

interface UserActionMarkdownProps {
  content: string;
  id: string;
  isEditable: boolean;
  onChangeEditable: (id: string) => void;
  onSaveContent: (content: string) => void;
}

export const UserActionMarkdown = ({
  id,
  content,
  isEditable,
  onChangeEditable,
  onSaveContent,
}: UserActionMarkdownProps) => {
  const [myContent, setMyContent] = useState(content);

  const handleCancelAction = useCallback(() => {
    onChangeEditable(id);
  }, [id, onChangeEditable]);

  const handleSaveAction = useCallback(() => {
    if (myContent !== content) {
      onSaveContent(content);
    }
    onChangeEditable(id);
  }, [content, id, myContent, onChangeEditable, onSaveContent]);

  const handleOnChange = useCallback(() => {
    if (myContent !== content) {
      setMyContent(content);
    }
  }, [content, myContent]);

  const renderButtons = useCallback(
    ({ cancelAction, saveAction }) => {
      return (
        <EuiFlexGroup gutterSize="s" alignItems="center">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty size="s" onClick={cancelAction} iconType="cross">
              {i18n.CANCEL}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton color="secondary" fill iconType="save" onClick={saveAction} size="s">
              {i18n.SAVE}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    },
    [handleCancelAction, handleSaveAction]
  );

  return isEditable ? (
    <MarkdownEditor
      footerContentRight={renderButtons({
        cancelAction: handleCancelAction,
        saveAction: handleSaveAction,
      })}
      initialContent={content}
      onChange={handleOnChange}
    />
  ) : (
    <ContentWrapper>
      <Markdown raw={content} data-test-subj="case-view-description" />
    </ContentWrapper>
  );
};
