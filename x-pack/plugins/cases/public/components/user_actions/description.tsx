/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import classNames from 'classnames';
import type { EuiCommentProps } from '@elastic/eui';
import styled from 'styled-components';
import { EuiText } from '@elastic/eui';

import type { UserActionBuilder, UserActionBuilderArgs, UserActionTreeProps } from './types';
import { createCommonUpdateUserActionBuilder } from './common';
import { UserActionContentToolbar } from './content_toolbar';
import { UserActionTimestamp } from './timestamp';
import { UserActionMarkdown } from './markdown_form';
import { getMarkdownEditorStorageKey } from '../markdown_editor/utils';
import * as i18n from './translations';
import { HoverableAvatarResolver } from '../user_profiles/hoverable_avatar_resolver';
import { HoverableUsernameResolver } from '../user_profiles/hoverable_username_resolver';
import { DescriptionPropertyActions } from './property_actions/description_property_actions';

const DESCRIPTION_ID = 'description';

const getLabelTitle = () => `${i18n.EDITED_FIELD} ${i18n.DESCRIPTION.toLowerCase()}`;

type GetDescriptionUserActionArgs = Pick<
  UserActionBuilderArgs,
  | 'caseData'
  | 'commentRefs'
  | 'manageMarkdownEditIds'
  | 'handleManageMarkdownEditId'
  | 'handleManageQuote'
  | 'userProfiles'
  | 'appId'
> &
  Pick<UserActionTreeProps, 'onUpdateField' | 'isLoadingDescription'>;

const MyEuiCommentFooter = styled(EuiText)`
  ${({ theme }) => `
    border-top: ${theme.eui.euiBorderThin};
    padding: ${theme.eui.euiSizeS};
  `}
`;

const hasDraftComment = (appId = '', caseId: string, commentId: string): boolean => {
  const draftStorageKey = getMarkdownEditorStorageKey(appId, caseId, commentId);

  return Boolean(sessionStorage.getItem(draftStorageKey));
};

export const getDescriptionUserAction = ({
  appId,
  userProfiles,
  caseData,
  commentRefs,
  manageMarkdownEditIds,
  isLoadingDescription,
  onUpdateField,
  handleManageMarkdownEditId,
  handleManageQuote,
}: GetDescriptionUserActionArgs): EuiCommentProps => {
  const isEditable = manageMarkdownEditIds.includes(DESCRIPTION_ID);
  return {
    username: <HoverableUsernameResolver user={caseData.createdBy} userProfiles={userProfiles} />,
    event: i18n.ADDED_DESCRIPTION,
    'data-test-subj': 'description-action',
    timestamp: <UserActionTimestamp createdAt={caseData.createdAt} />,
    children: (
      <>
        <UserActionMarkdown
          key={isEditable ? DESCRIPTION_ID : undefined}
          ref={(element) => (commentRefs.current[DESCRIPTION_ID] = element)}
          caseId={caseData.id}
          id={DESCRIPTION_ID}
          content={caseData.description}
          isEditable={isEditable}
          onSaveContent={(content: string) => {
            onUpdateField({ key: DESCRIPTION_ID, value: content });
          }}
          onChangeEditable={handleManageMarkdownEditId}
        />
        {!isEditable &&
        !isLoadingDescription &&
        hasDraftComment(appId, caseData.id, DESCRIPTION_ID) ? (
          <MyEuiCommentFooter>
            <EuiText color="subdued" size="xs" data-test-subj="description-unsaved-draft">
              {i18n.UNSAVED_DRAFT_DESCRIPTION}
            </EuiText>
          </MyEuiCommentFooter>
        ) : (
          ''
        )}
      </>
    ),
    timelineAvatar: (
      <HoverableAvatarResolver user={caseData.createdBy} userProfiles={userProfiles} />
    ),
    className: classNames({
      isEdit: manageMarkdownEditIds.includes(DESCRIPTION_ID),
      draftFooter:
        !isEditable && !isLoadingDescription && hasDraftComment(appId, caseData.id, DESCRIPTION_ID),
    }),
    actions: (
      <UserActionContentToolbar id={DESCRIPTION_ID}>
        <DescriptionPropertyActions
          isLoading={isLoadingDescription}
          onEdit={() => handleManageMarkdownEditId(DESCRIPTION_ID)}
          onQuote={() => handleManageQuote(caseData.description)}
        />
      </UserActionContentToolbar>
    ),
  };
};

export const createDescriptionUserActionBuilder: UserActionBuilder = ({
  userAction,
  userProfiles,
  handleOutlineComment,
}) => ({
  build: () => {
    const label = getLabelTitle();
    const commonBuilder = createCommonUpdateUserActionBuilder({
      userAction,
      userProfiles,
      handleOutlineComment,
      label,
      icon: 'dot',
    });

    return commonBuilder.build();
  },
});
