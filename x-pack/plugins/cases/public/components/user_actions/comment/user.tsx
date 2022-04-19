/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';

import { CommentResponseUserType } from '../../../../common/api';
import { UserActionTimestamp } from '../timestamp';
import { SnakeToCamelCase } from '../../../../common/types';
import { UserActionMarkdown } from '../markdown_form';
import { UserActionAvatar } from '../avatar';
import { UserActionContentToolbar } from '../content_toolbar';
import { UserActionUsername } from '../username';
import * as i18n from '../translations';
import { UserActionBuilderArgs, UserActionBuilder } from '../types';

type BuilderArgs = Pick<
  UserActionBuilderArgs,
  | 'userCanCrud'
  | 'handleManageMarkdownEditId'
  | 'handleSaveComment'
  | 'handleManageQuote'
  | 'commentRefs'
  | 'handleDeleteComment'
> & {
  comment: SnakeToCamelCase<CommentResponseUserType>;
  outlined: boolean;
  isEdit: boolean;
  isLoading: boolean;
};

export const createUserAttachmentUserActionBuilder = ({
  comment,
  userCanCrud,
  outlined,
  isEdit,
  isLoading,
  commentRefs,
  handleManageMarkdownEditId,
  handleSaveComment,
  handleManageQuote,
  handleDeleteComment,
}: BuilderArgs): ReturnType<UserActionBuilder> => ({
  // TODO: Fix this manually. Issue #123375
  // eslint-disable-next-line react/display-name
  build: () => [
    {
      username: (
        <UserActionUsername
          username={comment.createdBy.username}
          fullName={comment.createdBy.fullName}
        />
      ),
      'data-test-subj': `comment-create-action-${comment.id}`,
      timestamp: (
        <UserActionTimestamp createdAt={comment.createdAt} updatedAt={comment.updatedAt} />
      ),
      className: classNames('userAction__comment', {
        outlined,
        isEdit,
      }),
      children: (
        <UserActionMarkdown
          ref={(element) => (commentRefs.current[comment.id] = element)}
          id={comment.id}
          content={comment.comment}
          isEditable={isEdit}
          onChangeEditable={handleManageMarkdownEditId}
          onSaveContent={handleSaveComment.bind(null, {
            id: comment.id,
            version: comment.version,
          })}
        />
      ),
      timelineIcon: (
        <UserActionAvatar
          username={comment.createdBy.username}
          fullName={comment.createdBy.fullName}
        />
      ),
      actions: (
        <UserActionContentToolbar
          id={comment.id}
          commentMarkdown={comment.comment}
          editLabel={i18n.EDIT_COMMENT}
          deleteLabel={i18n.DELETE_COMMENT}
          deleteConfirmTitle={i18n.DELETE_COMMENT_TITLE}
          quoteLabel={i18n.QUOTE}
          isLoading={isLoading}
          onEdit={handleManageMarkdownEditId.bind(null, comment.id)}
          onQuote={handleManageQuote.bind(null, comment.comment)}
          onDelete={handleDeleteComment.bind(null, comment.id)}
          userCanCrud={userCanCrud}
        />
      ),
    },
  ],
});
