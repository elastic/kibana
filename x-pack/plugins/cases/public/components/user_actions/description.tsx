/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import { EuiCommentProps } from '@elastic/eui';

import type { UserActionBuilder, UserActionBuilderArgs, UserActionTreeProps } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import { UserActionUsername } from './username';
import { UserActionAvatar } from './avatar';
import { UserActionContentToolbar } from './content_toolbar';
import { UserActionTimestamp } from './timestamp';
import { UserActionMarkdown } from './markdown_form';
import * as i18n from './translations';

const DESCRIPTION_ID = 'description';

const getLabelTitle = () => `${i18n.EDITED_FIELD} ${i18n.DESCRIPTION.toLowerCase()}`;

type GetDescriptionUserActionArgs = Pick<
  UserActionBuilderArgs,
  | 'caseData'
  | 'commentRefs'
  | 'manageMarkdownEditIds'
  | 'userCanCrud'
  | 'handleManageMarkdownEditId'
  | 'handleManageQuote'
> &
  Pick<UserActionTreeProps, 'onUpdateField' | 'isLoadingDescription'>;

export const getDescriptionUserAction = ({
  caseData,
  commentRefs,
  manageMarkdownEditIds,
  isLoadingDescription,
  userCanCrud,
  onUpdateField,
  handleManageMarkdownEditId,
  handleManageQuote,
}: GetDescriptionUserActionArgs): EuiCommentProps => {
  return {
    username: (
      <UserActionUsername
        username={caseData.createdBy.username}
        fullName={caseData.createdBy.fullName}
      />
    ),
    event: i18n.ADDED_DESCRIPTION,
    'data-test-subj': 'description-action',
    timestamp: <UserActionTimestamp createdAt={caseData.createdAt} />,
    children: (
      <UserActionMarkdown
        ref={(element) => (commentRefs.current[DESCRIPTION_ID] = element)}
        id={DESCRIPTION_ID}
        content={caseData.description}
        isEditable={manageMarkdownEditIds.includes(DESCRIPTION_ID)}
        onSaveContent={(content: string) => {
          onUpdateField({ key: DESCRIPTION_ID, value: content });
        }}
        onChangeEditable={handleManageMarkdownEditId}
      />
    ),
    timelineIcon: (
      <UserActionAvatar
        username={caseData.createdBy.username}
        fullName={caseData.createdBy.fullName}
      />
    ),
    className: classNames({
      isEdit: manageMarkdownEditIds.includes(DESCRIPTION_ID),
    }),
    actions: (
      <UserActionContentToolbar
        commentMarkdown={caseData.description}
        id={DESCRIPTION_ID}
        editLabel={i18n.EDIT_DESCRIPTION}
        quoteLabel={i18n.QUOTE}
        isLoading={isLoadingDescription}
        onEdit={handleManageMarkdownEditId.bind(null, DESCRIPTION_ID)}
        onQuote={handleManageQuote.bind(null, caseData.description)}
        userCanCrud={userCanCrud}
      />
    ),
  };
};

export const createDescriptionUserActionBuilder: UserActionBuilder = ({
  userAction,
  handleOutlineComment,
}) => ({
  build: () => {
    const label = getLabelTitle();
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});
