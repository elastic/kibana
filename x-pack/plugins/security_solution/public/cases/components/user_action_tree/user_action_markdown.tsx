/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from 'styled-components';

import * as i18n from '../case_view/translations';
import { Markdown } from '../../../common/components/markdown';
import { Form, useForm, UseField } from '../../../shared_imports';
import { schema, Content } from './schema';
import { InsertTimelinePopover } from '../../../timelines/components/timeline/insert_timeline_popover';
import { useInsertTimeline } from '../../../timelines/components/timeline/insert_timeline_popover/use_insert_timeline';
import { MarkdownEditorForm } from '../../../common/components//markdown_editor/form';
import { useTimelineClick } from '../utils/use_timeline_click';

const ContentWrapper = styled.div`
  padding: ${({ theme }) => `${theme.eui.euiSizeM} ${theme.eui.euiSizeL}`};
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
  const initialState = { content };
  const { form } = useForm<Content>({
    defaultValue: initialState,
    options: { stripEmptyFields: false },
    schema,
  });
  const { submit } = form;
  const { handleCursorChange, handleOnTimelineChange } = useInsertTimeline<Content>(
    form,
    'content'
  );
  const handleCancelAction = useCallback(() => {
    onChangeEditable(id);
  }, [id, onChangeEditable]);

  const handleTimelineClick = useTimelineClick();

  const handleSaveAction = useCallback(async () => {
    const { isValid, data } = await submit();
    if (isValid) {
      onSaveContent(data.content);
    }
    onChangeEditable(id);
  }, [id, onChangeEditable, onSaveContent, submit]);

  const renderButtons = useCallback(
    ({ cancelAction, saveAction }) => (
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            data-test-subj="user-action-cancel-markdown"
            size="s"
            onClick={cancelAction}
            iconType="cross"
          >
            {i18n.CANCEL}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            data-test-subj="user-action-save-markdown"
            color="secondary"
            fill
            iconType="save"
            onClick={saveAction}
            size="s"
          >
            {i18n.SAVE}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    ),
    []
  );

  return isEditable ? (
    <Form form={form} data-test-subj="user-action-markdown-form">
      <UseField
        path="content"
        component={MarkdownEditorForm}
        componentProps={{
          bottomRightContent: renderButtons({
            cancelAction: handleCancelAction,
            saveAction: handleSaveAction,
          }),
          onClickTimeline: handleTimelineClick,
          onCursorPositionUpdate: handleCursorChange,
          topRightContent: (
            <InsertTimelinePopover
              hideUntitled={true}
              isDisabled={false}
              onTimelineChange={handleOnTimelineChange}
            />
          ),
        }}
      />
    </Form>
  ) : (
    <ContentWrapper>
      <Markdown
        onClickTimeline={handleTimelineClick}
        raw={content}
        data-test-subj="user-action-markdown"
      />
    </ContentWrapper>
  );
};
