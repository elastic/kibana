/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import { css } from '@emotion/react';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiText } from '@elastic/eui';

import type { UserCommentAttachment } from '../../../../common/types/domain';
import { UserActionTimestamp } from '../timestamp';
import type { SnakeToCamelCase } from '../../../../common/types';
import { UserActionMarkdown } from '../markdown_form';
import { UserActionContentToolbar } from '../content_toolbar';
import type { UserActionBuilderArgs, UserActionBuilder } from '../types';
import { HoverableUsernameResolver } from '../../user_profiles/hoverable_username_resolver';
import { HoverableAvatarResolver } from '../../user_profiles/hoverable_avatar_resolver';
import { UserCommentPropertyActions } from '../property_actions/user_comment_property_actions';
import { getMarkdownEditorStorageKey } from '../../markdown_editor/utils';
import * as i18n from './translations';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'handleManageMarkdownEditId'
  | 'handleSaveComment'
  | 'handleManageQuote'
  | 'commentRefs'
  | 'handleDeleteComment'
  | 'userProfiles'
  | 'appId'
  | 'euiTheme'
> & {
  comment: SnakeToCamelCase<UserCommentAttachment>;
  caseId: string;
  outlined: boolean;
  isEdit: boolean;
  isLoading: boolean;
};

const getCommentFooterCss = (euiTheme?: EuiThemeComputed<{}>) => {
  if (!euiTheme) {
    return css``;
  }
  return css`
    border-top: ${euiTheme.border.thin};
    padding: ${euiTheme.size.s};
  `;
};

const hasDraftComment = (
  applicationId = '',
  caseId: string,
  commentId: string,
  comment: string
): boolean => {
  const draftStorageKey = getMarkdownEditorStorageKey({ appId: applicationId, caseId, commentId });

  const sessionValue = sessionStorage.getItem(draftStorageKey);

  return Boolean(sessionValue && sessionValue !== comment);
};

export const createUserAttachmentUserActionBuilder = ({
  appId,
  comment,
  userProfiles,
  outlined,
  isEdit,
  isLoading,
  commentRefs,
  caseId,
  euiTheme,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleManageQuote,
  handleDeleteComment,
}: BuilderArgs): ReturnType<UserActionBuilder> => ({
  build: () => [
    {
      username: <HoverableUsernameResolver user={comment.createdBy} userProfiles={userProfiles} />,
      'data-test-subj': `comment-create-action-${comment.id}`,
      timestamp: (
        <UserActionTimestamp createdAt={comment.createdAt} updatedAt={comment.updatedAt} />
      ),
      className: classNames('userAction__comment', {
        outlined,
        isEdit,
        draftFooter:
          !isEdit && !isLoading && hasDraftComment(appId, caseId, comment.id, comment.comment),
      }),
      children: (
        <>
          <UserActionMarkdown
            key={isEdit ? comment.id : undefined}
            ref={(element) => (commentRefs.current[comment.id] = element)}
            id={comment.id}
            content={comment.comment}
            isEditable={isEdit}
            caseId={caseId}
            onChangeEditable={handleManageMarkdownEditId}
            onSaveContent={handleSaveComment.bind(null, {
              id: comment.id,
              version: comment.version,
            })}
          />
          {!isEdit && !isLoading && hasDraftComment(appId, caseId, comment.id, comment.comment) ? (
            <EuiText css={getCommentFooterCss(euiTheme)}>
              <EuiText color="subdued" size="xs" data-test-subj="user-action-comment-unsaved-draft">
                {i18n.UNSAVED_DRAFT_COMMENT}
              </EuiText>
            </EuiText>
          ) : (
            ''
          )}
        </>
      ),
      timelineAvatar: (
        <HoverableAvatarResolver user={comment.createdBy} userProfiles={userProfiles} />
      ),
      actions: (
        <UserActionContentToolbar id={comment.id}>
          <UserCommentPropertyActions
            isLoading={isLoading}
            commentContent={comment.comment}
            onEdit={() => handleManageMarkdownEditId(comment.id)}
            onDelete={() => handleDeleteComment(comment.id, i18n.DELETE_COMMENT_SUCCESS_TITLE)}
            onQuote={() => handleManageQuote(comment.comment)}
          />
        </UserActionContentToolbar>
      ),
    },
  ],
});
