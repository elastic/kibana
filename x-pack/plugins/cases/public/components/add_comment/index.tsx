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
import { css } from '@emotion/react';
import { EuiButton, EuiFlexItem, EuiFlexGroup, EuiLoadingSpinner } from '@elastic/eui';
import { isEmpty } from 'lodash';

import {
  Form,
  useForm,
  UseField,
  useFormData,
} from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { AttachmentType } from '../../../common/types/domain';
import { useCreateAttachments } from '../../containers/use_create_attachments';
import type { CaseUI } from '../../containers/types';
import type { MarkdownEditorRef } from '../markdown_editor';
import { MarkdownEditorForm } from '../markdown_editor';
import { getMarkdownEditorStorageKey } from '../markdown_editor/utils';
import { removeItemFromSessionStorage } from '../utils';

import * as i18n from './translations';
import type { AddCommentFormSchema } from './schema';
import { schema } from './schema';
import { InsertTimeline } from '../insert_timeline';
import { useCasesContext } from '../cases_context/use_cases_context';
import { MAX_COMMENT_LENGTH } from '../../../common/constants';

const initialCommentValue: AddCommentFormSchema = {
  comment: '',
};

export interface AddCommentRefObject {
  addQuote: (quote: string) => void;
  setComment: (newComment: string) => void;
  editor: MarkdownEditorRef | null;
}

/* eslint-disable react/no-unused-prop-types */
export interface AddCommentProps {
  id: string;
  caseId: string;
  onCommentSaving?: () => void;
  onCommentPosted: (newCase: CaseUI) => void;
  showLoading?: boolean;
  statusActionButton: JSX.Element | null;
}
/* eslint-enable react/no-unused-prop-types */

export const AddComment = React.memo(
  forwardRef<AddCommentRefObject, AddCommentProps>(
    (
      { id, caseId, onCommentPosted, onCommentSaving, showLoading = true, statusActionButton },
      ref
    ) => {
      const editorRef = useRef<MarkdownEditorRef>(null);
      const [focusOnContext, setFocusOnContext] = useState(false);
      const { permissions, owner } = useCasesContext();
      const { isLoading, mutate: createAttachments } = useCreateAttachments();
      const draftStorageKey = getMarkdownEditorStorageKey({
        appId: owner[0],
        caseId,
        commentId: id,
      });

      const { form } = useForm<AddCommentFormSchema>({
        defaultValue: initialCommentValue,
        options: { stripEmptyFields: false },
        schema,
      });

      const fieldName = 'comment';
      const { setFieldValue, reset, submit } = form;
      const [{ comment }] = useFormData<{ comment: string }>({ form, watch: [fieldName] });

      const addQuote = useCallback<AddCommentRefObject['addQuote']>(
        (quote) => {
          const addCarrots = quote.replace(new RegExp('\r?\n', 'g'), '\n> ');
          const val = `> ${addCarrots} \n\n`;
          setFieldValue(fieldName, `${comment}${comment.length > 0 ? '\n\n' : ''}${val}`);
          setFocusOnContext(true);
        },
        [comment, setFieldValue]
      );

      const setComment = useCallback<AddCommentRefObject['setComment']>(
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

          createAttachments(
            {
              caseId,
              caseOwner: owner[0],
              attachments: [{ ...data, type: AttachmentType.user }],
            },
            {
              onSuccess: (theCase) => {
                onCommentPosted(theCase);
              },
            }
          );

          reset({ defaultValue: {} });
        }

        removeItemFromSessionStorage(draftStorageKey);
      }, [
        submit,
        onCommentSaving,
        createAttachments,
        caseId,
        owner,
        onCommentPosted,
        reset,
        draftStorageKey,
      ]);

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

      const isDisabled =
        isLoading || !comment?.trim().length || comment.trim().length > MAX_COMMENT_LENGTH;

      return (
        <span id="add-comment-permLink">
          {isLoading && showLoading && (
            <EuiLoadingSpinner
              css={css`
                position: absolute;
                top: 50%;
                left: 50%;
              `}
              data-test-subj="loading-spinner"
              size="xl"
            />
          )}
          {permissions.createComment && (
            <Form form={form} data-test-subj="add-comment-form-wrapper">
              <UseField
                path={fieldName}
                component={MarkdownEditorForm}
                componentProps={{
                  ref: editorRef,
                  id,
                  draftStorageKey,
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
                          isDisabled={isDisabled}
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
