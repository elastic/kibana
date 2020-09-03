/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiButtonEmpty,
  EuiButton,
  EuiMarkdownFormat,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';

import * as i18n from '../case_view/translations';
import { Markdown } from '../../../common/components/markdown';
import { Form, useForm, UseField, useFormData } from '../../../shared_imports';
import { schema, Content } from './schema';
import { InsertTimelinePopover } from '../../../timelines/components/timeline/insert_timeline_popover';
import { useInsertTimeline } from '../../../timelines/components/timeline/insert_timeline_popover/use_insert_timeline';
import { MarkdownEditorForm } from '../../../common/components//markdown_editor/new_form';
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

  const fieldName = 'content';
  const { submit, setFieldValue } = form;
  const [{ content: contentFormValue }] = useFormData({ form, watch: [fieldName] });

  const onContentChange = useCallback((newValue) => setFieldValue(fieldName, newValue), [
    setFieldValue,
  ]);

  const { handleCursorChange, handleOnTimelineChange } = useInsertTimeline(
    contentFormValue,
    onContentChange
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
        path={fieldName}
        component={MarkdownEditorForm}
        componentProps={{
          'aria-label': 'Cases markdown editor',
          value: content,
          id,
          bottomRightContent: renderButtons({
            cancelAction: handleCancelAction,
            saveAction: handleSaveAction,
          }),
        }}
      />
    </Form>
  ) : (
    <ContentWrapper data-test-subj="user-action-markdown">
      <EuiMarkdownFormat>{content}</EuiMarkdownFormat>
    </ContentWrapper>
  );
};
