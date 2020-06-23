/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButtonEmpty, EuiButton } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled, { css } from 'styled-components';

import { useDispatch } from 'react-redux';
import * as i18n from '../case_view/translations';
import { Markdown } from '../../../common/components/markdown';
import { Form, useForm, UseField } from '../../../shared_imports';
import { schema, Content } from './schema';
import { InsertTimelinePopover } from '../../../timelines/components/timeline/insert_timeline_popover';
import { useInsertTimeline } from '../../../timelines/components/timeline/insert_timeline_popover/use_insert_timeline';
import { MarkdownEditorForm } from '../../../common/components//markdown_editor/form';
import {
  dispatchUpdateTimeline,
  queryTimelineById,
} from '../../../timelines/components/open_timeline/helpers';

import { updateIsLoading as dispatchUpdateIsLoading } from '../../../timelines/store/timeline/actions';
import { useApolloClient } from '../../../common/utils/apollo_context';

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
  const dispatch = useDispatch();
  const apolloClient = useApolloClient();
  const { form } = useForm<Content>({
    defaultValue: { content },
    options: { stripEmptyFields: false },
    schema,
  });
  const { handleCursorChange, handleOnTimelineChange } = useInsertTimeline<Content>(
    form,
    'content'
  );
  const handleCancelAction = useCallback(() => {
    onChangeEditable(id);
  }, [id, onChangeEditable]);

  const handleTimelineClick = useCallback(
    (timelineId: string) => {
      queryTimelineById({
        apolloClient,
        timelineId,
        updateIsLoading: ({
          id: currentTimelineId,
          isLoading,
        }: {
          id: string;
          isLoading: boolean;
        }) => dispatch(dispatchUpdateIsLoading({ id: currentTimelineId, isLoading })),
        updateTimeline: dispatchUpdateTimeline(dispatch),
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [apolloClient]
  );

  const handleSaveAction = useCallback(async () => {
    const { isValid, data } = await form.submit();
    if (isValid) {
      onSaveContent(data.content);
    }
    onChangeEditable(id);
  }, [form, id, onChangeEditable, onSaveContent]);

  const renderButtons = useCallback(
    ({ cancelAction, saveAction }) => {
      return (
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
      );
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleCancelAction, handleSaveAction]
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
