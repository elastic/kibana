/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import { EuiCommentList } from '@elastic/eui';

import React, { useMemo, useEffect, useState } from 'react';
import styled from 'styled-components';

import type { UserActionUI } from '../../containers/types';
import type { UserActionBuilderArgs, UserActionTreeProps } from './types';
import { isUserActionTypeSupported } from './helpers';
import { useCasesContext } from '../cases_context/use_cases_context';
import { builderMap } from './builder';
import { useCaseViewParams } from '../../common/navigation';
import { useUserActionsHandler } from './use_user_actions_handler';

const MyEuiCommentList = styled(EuiCommentList)`
  ${({ theme }) => `
    & .userAction__comment.outlined .euiCommentEvent {
      outline: solid 5px ${theme.eui.euiColorVis1_behindText};
      margin: 0.5em;
      transition: 0.8s;
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

    & .comment-action.empty-comment [class*="euiCommentEvent-regular"] {
      box-shadow: none;
      .euiCommentEvent__header {
        padding: ${theme.eui.euiSizeM} ${theme.eui.euiSizeS};
        border-bottom: 0;
      }
    }
  `}
`;

export type UserActionListProps = Omit<
  UserActionTreeProps,
  | 'userActivityQueryParams'
  | 'userActionsStats'
  | 'useFetchAlertData'
  | 'onUpdateField'
  | 'statusActionButton'
> &
  Pick<UserActionBuilderArgs, 'commentRefs' | 'handleManageQuote'> & {
    caseUserActions: UserActionUI[];
    loadingAlertData: boolean;
    manualAlertsData: Record<string, unknown>;
    bottomActions?: EuiCommentProps[];
    isExpandable?: boolean;
  };

export const UserActionsList = React.memo(
  ({
    caseUserActions,
    caseConnectors,
    userProfiles,
    currentUserProfile,
    data: caseData,
    getRuleDetailsHref,
    actionsNavigation,
    onRuleDetailsClick,
    onShowAlertDetails,
    loadingAlertData,
    manualAlertsData,
    commentRefs,
    handleManageQuote,
    bottomActions = [],
    isExpandable = false,
  }: UserActionListProps) => {
    const {
      externalReferenceAttachmentTypeRegistry,
      persistableStateAttachmentTypeRegistry,
      appId,
    } = useCasesContext();
    const { commentId } = useCaseViewParams();
    const [initLoading, setInitLoading] = useState(true);

    const {
      loadingCommentIds,
      selectedOutlineCommentId,
      manageMarkdownEditIds,
      handleManageMarkdownEditId,
      handleOutlineComment,
      handleSaveComment,
      handleDeleteComment,
    } = useUserActionsHandler();

    const builtUserActions: EuiCommentProps[] = useMemo(() => {
      if (!caseUserActions) {
        return [];
      }

      return caseUserActions.reduce<EuiCommentProps[]>((comments, userAction, index) => {
        if (!isUserActionTypeSupported(userAction.type)) {
          return comments;
        }

        const builder = builderMap[userAction.type];

        if (builder == null) {
          return comments;
        }

        const userActionBuilder = builder({
          appId,
          caseData,
          caseConnectors,
          externalReferenceAttachmentTypeRegistry,
          persistableStateAttachmentTypeRegistry,
          userAction,
          userProfiles,
          currentUserProfile,
          comments: caseData?.comments,
          index,
          commentRefs,
          manageMarkdownEditIds,
          selectedOutlineCommentId,
          loadingCommentIds,
          loadingAlertData,
          alertData: manualAlertsData,
          handleOutlineComment,
          handleManageMarkdownEditId,
          handleDeleteComment,
          handleSaveComment,
          handleManageQuote,
          onShowAlertDetails,
          actionsNavigation,
          getRuleDetailsHref,
          onRuleDetailsClick,
        });
        return [...comments, ...userActionBuilder.build()];
      }, []);
    }, [
      appId,
      caseConnectors,
      caseUserActions,
      userProfiles,
      currentUserProfile,
      externalReferenceAttachmentTypeRegistry,
      persistableStateAttachmentTypeRegistry,
      caseData,
      commentRefs,
      manageMarkdownEditIds,
      selectedOutlineCommentId,
      loadingCommentIds,
      loadingAlertData,
      manualAlertsData,
      handleOutlineComment,
      handleManageMarkdownEditId,
      handleDeleteComment,
      handleSaveComment,
      handleManageQuote,
      onShowAlertDetails,
      actionsNavigation,
      getRuleDetailsHref,
      onRuleDetailsClick,
    ]);

    const comments = bottomActions?.length
      ? [...builtUserActions, ...bottomActions]
      : [...builtUserActions];

    useEffect(() => {
      if (commentId != null && initLoading) {
        setInitLoading(false);
        handleOutlineComment(commentId);
      }
    }, [commentId, initLoading, handleOutlineComment]);

    return (
      <MyEuiCommentList
        className={isExpandable ? 'commentList--hasShowMore' : ''}
        comments={comments}
        data-test-subj="user-actions-list"
      />
    );
  }
);

UserActionsList.displayName = 'UserActionsList';
