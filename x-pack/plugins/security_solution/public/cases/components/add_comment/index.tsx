/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiButton, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';

import { CommentRequest, CommentType } from '../../../../../case/common/api';
import { usePostComment } from '../../containers/use_post_comment';
import { Case } from '../../containers/types';
import { MarkdownEditorForm } from '../../../common/components/markdown_editor/eui_form';
import { useInsertTimeline } from '../../../timelines/components/timeline/insert_timeline_popover/use_insert_timeline';
import { Form, useForm, UseField, useFormData } from '../../../shared_imports';

import * as i18n from './translations';
import { schema } from './schema';
import { useTimelineClick } from '../../../common/utils/timeline/use_timeline_click';

const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
`;

const initialCommentValue: CommentRequest = {
  comment: '',
  context: { type: CommentType.user, savedObjectId: null },
};

export interface AddCommentRefObject {
  addQuote: (quote: string) => void;
}

interface AddCommentProps {
  caseId: string;
  disabled?: boolean;
  onCommentSaving?: () => void;
  onCommentPosted: (newCase: Case) => void;
  showLoading?: boolean;
}

export const AddComment = React.memo(
  forwardRef<AddCommentRefObject, AddCommentProps>(
    ({ caseId, disabled, showLoading = true, onCommentPosted, onCommentSaving }, ref) => {
      const { isLoading, postComment } = usePostComment(caseId);

      const { form } = useForm<CommentRequest>({
        defaultValue: initialCommentValue,
        options: { stripEmptyFields: false },
        schema,
      });

      const fieldName = 'comment';
      const { setFieldValue, reset, submit } = form;
      const [{ comment }] = useFormData<{ comment: string }>({ form, watch: [fieldName] });

      const onCommentChange = useCallback((newValue) => setFieldValue(fieldName, newValue), [
        setFieldValue,
      ]);

      const { handleCursorChange } = useInsertTimeline(comment, onCommentChange);

      const addQuote = useCallback(
        (quote) => {
          setFieldValue(fieldName, `${comment}${comment.length > 0 ? '\n\n' : ''}${quote}`);
        },
        [comment, setFieldValue]
      );

      useImperativeHandle(ref, () => ({
        addQuote,
      }));

      const handleTimelineClick = useTimelineClick();

      const onSubmit = useCallback(async () => {
        const { isValid, data } = await submit();
        if (isValid) {
          if (onCommentSaving != null) {
            onCommentSaving();
          }
          postComment(
            { ...data, context: { type: CommentType.user, savedObjectId: null } },
            onCommentPosted
          );
          reset();
        }
      }, [onCommentPosted, onCommentSaving, postComment, reset, submit]);

      return (
        <span id="add-comment-permLink">
          {isLoading && showLoading && <MySpinner data-test-subj="loading-spinner" size="xl" />}
          <Form form={form}>
            <UseField
              path={fieldName}
              component={MarkdownEditorForm}
              componentProps={{
                idAria: 'caseComment',
                isDisabled: isLoading,
                dataTestSubj: 'add-comment',
                placeholder: i18n.ADD_COMMENT_HELP_TEXT,
                onCursorPositionUpdate: handleCursorChange,
                onClickTimeline: handleTimelineClick,
                bottomRightContent: (
                  <EuiButton
                    data-test-subj="submit-comment"
                    iconType="plusInCircle"
                    isDisabled={isLoading || disabled}
                    isLoading={isLoading}
                    onClick={onSubmit}
                    size="s"
                  >
                    {i18n.ADD_COMMENT}
                  </EuiButton>
                ),
              }}
            />
          </Form>
        </span>
      );
    }
  )
);

AddComment.displayName = 'AddComment';
