/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem, EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import styled from 'styled-components';

import { CommentType } from '../../../common';
import { usePostComment } from '../../containers/use_post_comment';
import { Case } from '../../containers/types';
import { MarkdownEditorForm } from '../markdown_editor';
import { Form, useForm, UseField, useFormData } from '../../common/shared_imports';

import * as i18n from './translations';
import { schema, AddCommentFormSchema } from './schema';
import { InsertTimeline } from '../insert_timeline';
import { useOwnerContext } from '../owner_context/use_owner_context';

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
