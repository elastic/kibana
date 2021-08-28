/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React, { forwardRef, useCallback, useImperativeHandle, useRef } from 'react';
import styled from 'styled-components';
import { Form } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/form';
import { UseField } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/components/use_field';
import { useForm } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form';
import { useFormData } from '../../../../../../src/plugins/es_ui_shared/static/forms/hook_form_lib/hooks/use_form_data';
import { CommentType } from '../../../common/api/cases/comment';
import type { Case } from '../../../common/ui/types';
import { usePostComment } from '../../containers/use_post_comment';
import { InsertTimeline } from '../insert_timeline';
import { MarkdownEditorForm } from '../markdown_editor/eui_form';
import { useOwnerContext } from '../owner_context/use_owner_context';
import type { AddCommentFormSchema } from './schema';
import { schema } from './schema';
import * as i18n from './translations';

const MySpinner = styled(EuiLoadingSpinner)`
  position: absolute;
  top: 50%;
  left: 50%;
`;

const initialCommentValue: AddCommentFormSchema = {
  comment: '',
};

export interface AddCommentRefObject {
  addQuote: (quote: string) => void;
  setComment: (newComment: string) => void;
}

export interface AddCommentProps {
  id: string;
  caseId: string;
  userCanCrud?: boolean;
  onCommentSaving?: () => void;
  onCommentPosted: (newCase: Case) => void;
  showLoading?: boolean;
  statusActionButton: JSX.Element | null;
  subCaseId?: string;
}

export const AddComment = React.memo(
  forwardRef<AddCommentRefObject, AddCommentProps>(
    (
      {
        id,
        caseId,
        userCanCrud,
        onCommentPosted,
        onCommentSaving,
        showLoading = true,
        statusActionButton,
        subCaseId,
      },
      ref
    ) => {
      const editorRef = useRef();
      const owner = useOwnerContext();
      const { isLoading, postComment } = usePostComment();

      const { form } = useForm<AddCommentFormSchema>({
        defaultValue: initialCommentValue,
        options: { stripEmptyFields: false },
        schema,
      });

      const fieldName = 'comment';
      const { setFieldValue, reset, submit } = form;
      const [{ comment }] = useFormData<{ comment: string }>({ form, watch: [fieldName] });

      const addQuote = useCallback(
        (quote) => {
          setFieldValue(fieldName, `${comment}${comment.length > 0 ? '\n\n' : ''}${quote}`);
        },
        [comment, setFieldValue]
      );

      const setComment = useCallback(
        (newComment) => {
          setFieldValue(fieldName, newComment);
        },
        [setFieldValue]
      );

      useImperativeHandle(ref, () => ({
        addQuote,
        setComment,
        editor: editorRef.current,
      }));

      const onSubmit = useCallback(async () => {
        const { isValid, data } = await submit();
        if (isValid) {
          if (onCommentSaving != null) {
            onCommentSaving();
          }
          postComment({
            caseId,
            data: { ...data, type: CommentType.user, owner: owner[0] },
            updateCase: onCommentPosted,
            subCaseId,
          });
          reset();
        }
      }, [submit, onCommentSaving, postComment, caseId, owner, onCommentPosted, subCaseId, reset]);

      return (
        <span id="add-comment-permLink">
          {isLoading && showLoading && <MySpinner data-test-subj="loading-spinner" size="xl" />}
          {userCanCrud && (
            <Form form={form}>
              <UseField
                path={fieldName}
                component={MarkdownEditorForm}
                componentProps={{
                  ref: editorRef,
                  id,
                  idAria: 'caseComment',
                  isDisabled: isLoading,
                  dataTestSubj: 'add-comment',
                  placeholder: i18n.ADD_COMMENT_HELP_TEXT,
                  bottomRightContent: (
                    <EuiFlexGroup gutterSize="s" alignItems="flexEnd" responsive={false} wrap>
                      {statusActionButton && (
                        <EuiFlexItem grow={false}>{statusActionButton}</EuiFlexItem>
                      )}
                      <EuiFlexItem grow={false}>
                        <EuiButton
                          data-test-subj="submit-comment"
                          fill
                          iconType="plusInCircle"
                          isDisabled={isLoading}
                          isLoading={isLoading}
                          onClick={onSubmit}
                        >
                          {i18n.ADD_COMMENT}
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  ),
                }}
              />
              <InsertTimeline fieldName="comment" />
            </Form>
          )}
        </span>
      );
    }
  )
);

AddComment.displayName = 'AddComment';
