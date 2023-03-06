/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import { EuiCommentList, EuiBadge, EuiButton, EuiSkeletonText } from '@elastic/eui';

import React, { useMemo, useCallback } from 'react';
import styled from 'styled-components';

import { useInfiniteFindCaseUserActions } from '../../containers/use_infinite_find_case_user_actions';
import type { CaseUserActions } from '../../containers/types';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import * as i18n from './translations';
import type { AddCommentMarkdown, UserActionBuilderArgs, UserActionTreeProps } from './types';
import { NEW_COMMENT_ID } from './constants';
import { isUserActionTypeSupported } from './helpers';
import { useCasesContext } from '../cases_context/use_cases_context';
import { builderMap } from './builder';

const MyEuiButton = styled(EuiButton)`
  margin-top: 16px;
  height: 100px;
`;

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

    & .comment-alert .euiCommentEvent {
      background-color: ${theme.eui.euiColorLightestShade};
      border: ${theme.eui.euiBorderThin};
      padding: ${theme.eui.euiSizeS};
      border-radius: ${theme.eui.euiSizeXS};
    }

    & .comment-alert .euiCommentEvent__headerData {
      flex-grow: 1;
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

export type UserActionListProps = UserActionTreeProps &
  Pick<
    UserActionBuilderArgs,
    | 'loadingCommentIds'
    | 'commentRefs'
    | 'manageMarkdownEditIds'
    | 'handleManageMarkdownEditId'
    | 'selectedOutlineCommentId'
    | 'handleOutlineComment'
    | 'handleSaveComment'
    | 'handleDeleteComment'
    | 'handleManageQuote'
  > & {
    loadingAlertData: boolean;
    manualAlertsData: Record<string, unknown>;
    bottomActions?: AddCommentMarkdown[];
    isExpandable?: boolean;
  };

export const UserActionsList = React.memo(
  ({
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
    manageMarkdownEditIds,
    handleManageMarkdownEditId,
    handleSaveComment,
    handleDeleteComment,
    handleManageQuote,
    handleOutlineComment,
    selectedOutlineCommentId,
    loadingCommentIds,
    userActivityQueryParams,
    bottomActions,
    isExpandable = false,
  }: UserActionListProps) => {
    const {
      externalReferenceAttachmentTypeRegistry,
      persistableStateAttachmentTypeRegistry,
      appId,
    } = useCasesContext();

    const {
      data: caseInfiniteUserActionsData,
      isLoading: isLoadingInfiniteUserActions,
      hasNextPage,
      fetchNextPage,
    } = useInfiniteFindCaseUserActions(caseData.id, userActivityQueryParams, isExpandable);

    const { data: caseUserActionsData, isLoading: isLoadingUserActions } = useFindCaseUserActions(
      caseData.id,
      userActivityQueryParams,
      !isExpandable
    );

    const caseUserActions = useMemo<CaseUserActions[]>(() => {
      if (!isExpandable) {
        return caseUserActionsData?.userActions ?? [];
      } else if (!caseInfiniteUserActionsData || !caseInfiniteUserActionsData?.pages?.length) {
        return [];
      }

      const data: CaseUserActions[] = [];

      caseInfiniteUserActionsData.pages.forEach((page) => data.push(...page.userActions));

      return data;
    }, [caseUserActionsData, caseInfiniteUserActionsData, isExpandable]);

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

    const handleShowMore = useCallback(() => {
      if (fetchNextPage) {
        fetchNextPage();
      }
    }, [fetchNextPage]);

    return (
      <>
        <EuiSkeletonText
          lines={8}
          data-test-subj="user-actions-loading"
          isLoading={
            isExpandable
              ? isLoadingInfiniteUserActions
              : isLoadingUserActions || loadingCommentIds.includes(NEW_COMMENT_ID)
          }
        >
          <MyEuiCommentList comments={comments} data-test-subj="user-actions-list" />
        </EuiSkeletonText>
        {hasNextPage && isExpandable && !isLoadingInfiniteUserActions && (
          <MyEuiButton
            onClick={handleShowMore}
            color="text"
            data-test-subj="show-more-user-actions"
          >
            <EuiBadge>{i18n.SHOW_MORE}</EuiBadge>
          </MyEuiButton>
        )}
      </>
    );
  }
);

UserActionsList.displayName = 'UserActionsList';
