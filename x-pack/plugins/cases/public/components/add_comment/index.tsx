/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useCallback,
  useRef,
  forwardRef,
  useImperativeHandle,
  useEffect,
  useState,
} from 'react';
import { EuiButton, EuiFlexItem, EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import styled from 'styled-components';
import { isEmpty } from 'lodash';

import { CommentType } from '../../../common/api';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import { Case } from '../../containers/types';
import { EuiMarkdownEditorRef, MarkdownEditorForm } from '../markdown_editor';
import { Form, useForm, UseField, useFormData } from '../../common/shared_imports';

import * as i18n from './translations';
import { schema, AddCommentFormSchema } from './schema';
import { InsertTimeline } from '../insert_timeline';
import { useCasesContext } from '../cases_context/use_cases_context';

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
  editor: EuiMarkdownEditorRef | null;
}

export interface AddCommentProps {
  id: string;
  caseId: string;
  userCanCrud?: boolean;
  onCommentSaving?: () => void;
  onCommentPosted: (newCase: Case) => void;
  showLoading?: boolean;
  statusActionButton: JSX.Element | null;
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
      },
      ref
    ) => {
      const editorRef = useRef<EuiMarkdownEditorRef>(null);
      const [focusOnContext, setFocusOnContext] = useState(false);
      const { owner } = useCasesContext();
      const { isLoading, createAttachments } = useCreateAttachments();

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
          const addCarrots = quote.replace(new RegExp('\r?\n', 'g'), '\n> ');
          const val = `> ${addCarrots} \n\n`;
          setFieldValue(fieldName, `${comment}${comment.length > 0 ? '\n\n' : ''}${val}`);
          setFocusOnContext(true);
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
          createAttachments({
            caseId,
            data: { ...data, type: CommentType.user, owner: owner[0] },
            updateCase: onCommentPosted,
          });
          reset();
        }
      }, [submit, onCommentSaving, createAttachments, caseId, owner, onCommentPosted, reset]);

      /**
       * Focus on the text area when a quote has been added.
       *
       * The useEffect will run only when focusOnContext
       * changes.
       *
       * The useEffect is also called once one mount
       * where the comment is empty. We do not want to focus
       * in this scenario.
       *
       * Ideally we would like to put the
       * editorRef.current?.textarea?.focus(); inside the if (focusOnContext).
       * The reason this is not feasible is because when it sets the
       * focusOnContext to false a render will occur again and the
       * focus will be lost.
       *
       * We do not put the comment in the dependency list
       * because we do not want to focus when the user
       * is typing.
       */

      useEffect(() => {
        if (!isEmpty(comment)) {
          editorRef.current?.textarea?.focus();
        }

        if (focusOnContext) {
          setFocusOnContext(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [focusOnContext]);

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
