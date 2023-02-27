/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiCommentProps } from '@elastic/eui';
import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner, EuiCommentList } from '@elastic/eui';

import React, { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';

import { builderMap } from './builder';
import { isUserActionTypeSupported } from './helpers';
import type { AddCommentMarkdown, UserActionBuilderArgs, UserActionTreeProps } from './types';
import { NEW_COMMENT_ID } from './constants';
import { useCasesContext } from '../cases_context/use_cases_context';
import { useFindCaseUserActions } from '../../containers/use_find_case_user_actions';
import type { CaseUserActions } from '../../containers/types';

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  margin-bottom: 8px;
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

type UserActionListProps = UserActionTreeProps &
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
    bottomActions: AddCommentMarkdown[];
    showOldData?: boolean;
    // lastPage?: number;
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
    userActivityQueryParams,
    manualAlertsData,
    bottomActions,
    commentRefs,
    manageMarkdownEditIds,
    handleManageMarkdownEditId,
    handleSaveComment,
    handleDeleteComment,
    handleManageQuote,
    handleOutlineComment,
    selectedOutlineCommentId,
    loadingCommentIds,
    showOldData = false,
  }: UserActionListProps) => {
    const {
      externalReferenceAttachmentTypeRegistry,
      persistableStateAttachmentTypeRegistry,
      appId,
    } = useCasesContext();

    // fetch last 10 in descending order
    // const params = !showOldData && userActivityQueryParams.page === lastPage && userActivityQueryParams.sortOrder === 'asc' ? {...userActivityQueryParams, sortOrder: 'desc', page:1} : userActivityQueryParams;

    // const { data: caseUserActionsData, isLoading: isLoadingUserActions } = useFindCaseUserActions(
    //   caseData.id,
    //   {
    //     ...params
    //   }
    // );

    const { data: caseUserActionsData, isLoading: isLoadingUserActions } = useFindCaseUserActions(
      caseData.id,
      userActivityQueryParams
    );

    const [caseUserActions, setCaseUserActions] = useState<CaseUserActions[]>([]);

    useEffect(() => {
      if (caseUserActionsData?.userActions) {
        setCaseUserActions((oldUserActions) => {
          if (oldUserActions.length && showOldData) {
            return [...oldUserActions, ...caseUserActionsData.userActions];
          }
          return [...caseUserActionsData.userActions];
        });
      }
    }, [caseUserActionsData?.userActions, showOldData]);

    const userActions: EuiCommentProps[] = useMemo(() => {
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

    const comments = [...userActions, ...bottomActions];

    return (
      <>
        {(isLoadingUserActions || loadingCommentIds.includes(NEW_COMMENT_ID)) && (
          <MyEuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner data-test-subj="user-actions-loading" size="l" />
            </EuiFlexItem>
          </MyEuiFlexGroup>
        )}
        <MyEuiCommentList comments={comments} data-test-subj="user-actions-list" />
      </>
    );
  }
);

UserActionsList.displayName = 'UserActionsList';
