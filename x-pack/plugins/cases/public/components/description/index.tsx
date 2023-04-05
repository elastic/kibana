/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { EuiButtonIcon, EuiCommentList, EuiCommentProps, EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiText } from '@elastic/eui';

import type { UserActionBuilderArgs, UserActionTreeProps } from '../user_actions/types';
import { UserActionMarkdown } from '../user_actions/markdown_form';
import { getMarkdownEditorStorageKey } from '../markdown_editor/utils';
import * as i18n from '../user_actions/translations';
import classNames from 'classnames';

const DESCRIPTION_ID = 'description';

type GetDescriptionUserActionArgs = Pick<
  UserActionBuilderArgs,
  | 'caseData'
  | 'userProfiles'
  | 'appId'
  > &
Pick<UserActionTreeProps, 'onUpdateField'> & { isLoadingDescription: boolean };

const MyEuiCommentFooter = styled(EuiText)`
  ${({ theme }) => `
    border-top: ${theme.eui.euiBorderThin};
    padding: ${theme.eui.euiSizeS};
  `}
`;

const MyEuiCommentList = styled(EuiCommentList)`
  & .euiComment > [class*='euiTimelineItemIcon-top'] {
    display: none;
  }

  & .draftFooter {
    & .euiCommentEvent__body {
      padding: 0;
    }
  }

  & .euiComment.isEdit {
    & .euiCommentEvent {
      border: none;
      box-shadow: none;
    }

    & .euiCommentEvent__body {
      padding: 0;
    }

    & .euiCommentEvent__header {
      display: none;
    }
  }
`;

const hasDraftComment = (appId = '', caseId: string, commentId: string): boolean => {
  const draftStorageKey = getMarkdownEditorStorageKey(appId, caseId, commentId);

  return Boolean(sessionStorage.getItem(draftStorageKey));
};

export const descriptionCommentListObj = ({
  appId,
  caseData,
  isLoadingDescription,
  onUpdateField,
}: GetDescriptionUserActionArgs): EuiCommentProps => {
  const [isEdit, setIsEdit] = useState<boolean>(false);
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  return {
    username: null,
    event: i18n.DESCRIPTION,
    'data-test-subj': 'description-action',
    timestamp: null,
    children: !isCollapsed ?
      <>
        <UserActionMarkdown
          caseId={caseData.id}
          id={DESCRIPTION_ID}
          content={caseData.description}
          isEditable={isEdit}
          onSaveContent={(content: string) => {
            onUpdateField({ key: DESCRIPTION_ID, value: content });
          }}
          onChangeEditable={() => {setIsEdit(false)}}
        />
        {!isEdit &&
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
      : null,
    timelineAvatar: null,
    className: classNames({
      isEdit,
      draftFooter:
        !isEdit && !isLoadingDescription && hasDraftComment(appId, caseData.id, DESCRIPTION_ID),
    }),
    actions: (
      <>
      <EuiButtonIcon
        aria-label={i18n.EDIT_DESCRIPTION}
        iconType="pencil"
        onClick={() => {setIsEdit(!isEdit)}}
        data-test-subj="description-edit-icon"
      />
      <EuiButtonIcon
        aria-label={i18n.COLLAPSE_DESCRIPTION}
        iconType="fold"
        onClick={() => {setIsCollapsed(!isCollapsed)}}
        data-test-subj="description-collapse-icon"
      />
      </>
    ),
  };
};

export const Description = React.memo(
  (props :GetDescriptionUserActionArgs ) => {
  const {
    isLoadingDescription,
  } = props;

  return isLoadingDescription ? (
    <EuiFlexGroup justifyContent="center" alignItems="center">
      <EuiFlexItem grow={false}>
        <EuiLoadingSpinner data-test-subj="description-loading" size="l" />
      </EuiFlexItem>
    </EuiFlexGroup>
  ) : (
    <MyEuiCommentList
      comments={[descriptionCommentListObj(props)]}
      data-test-subj="description-comment-list"
    />
  );

});

Description.displayName = 'Description';
