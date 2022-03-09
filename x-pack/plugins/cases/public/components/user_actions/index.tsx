/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiCommentList,
  EuiCommentProps,
} from '@elastic/eui';

import React, { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';

import { useCurrentUser } from '../../common/lib/kibana';
import { AddComment } from '../add_comment';
import { UserActionAvatar } from './avatar';
import { UserActionUsername } from './username';
import { useCaseViewParams } from '../../common/navigation';
import { builderMap } from './builder';
import { isUserActionTypeSupported, getManualAlertIdsWithNoRuleId } from './helpers';
import type { UserActionTreeProps } from './types';
import { getDescriptionUserAction } from './description';
import { useUserActionsHandler } from './use_user_actions_handler';
import { NEW_COMMENT_ID } from './constants';

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
      border: ${theme.eui.euiFlyoutBorder};
      padding: ${theme.eui.paddingSizes.s};
      border-radius: ${theme.eui.paddingSizes.xs};
    }

    & .comment-alert .euiCommentEvent__headerData {
      flex-grow: 1;
    }

    & .comment-action.empty-comment .euiCommentEvent--regular {
      box-shadow: none;
      .euiCommentEvent__header {
        padding: ${theme.eui.euiSizeM} ${theme.eui.paddingSizes.s};
        border-bottom: 0;
      }
    }
  `}
`;

export const UserActions = React.memo(
  ({
    caseServices,
    caseUserActions,
    data: caseData,
    fetchUserActions,
    getRuleDetailsHref,
    actionsNavigation,
    isLoadingDescription,
    isLoadingUserActions,
    onRuleDetailsClick,
    onShowAlertDetails,
    onUpdateField,
    statusActionButton,
    updateCase,
    useFetchAlertData,
    userCanCrud,
  }: UserActionTreeProps) => {
    const { detailName: caseId, commentId } = useCaseViewParams();
    const [initLoading, setInitLoading] = useState(true);
    const currentUser = useCurrentUser();

    const alertIdsWithoutRuleInfo = useMemo(
      () => getManualAlertIdsWithNoRuleId(caseData.comments),
      [caseData.comments]
    );

    const [loadingAlertData, manualAlertsData] = useFetchAlertData(alertIdsWithoutRuleInfo);

    const {
      loadingCommentIds,
      commentRefs,
      selectedOutlineCommentId,
      manageMarkdownEditIds,
      handleManageMarkdownEditId,
      handleOutlineComment,
      handleSaveComment,
      handleManageQuote,
      handleUpdate,
    } = useUserActionsHandler({ fetchUserActions, updateCase });

    const MarkdownNewComment = useMemo(
      () => (
        <AddComment
          id={NEW_COMMENT_ID}
          caseId={caseId}
          userCanCrud={userCanCrud}
          ref={(element) => (commentRefs.current[NEW_COMMENT_ID] = element)}
          onCommentPosted={handleUpdate}
          onCommentSaving={handleManageMarkdownEditId.bind(null, NEW_COMMENT_ID)}
          showLoading={false}
          statusActionButton={statusActionButton}
        />
      ),
      [
        caseId,
        userCanCrud,
        handleUpdate,
        handleManageMarkdownEditId,
        statusActionButton,
        commentRefs,
      ]
    );

    useEffect(() => {
      if (initLoading && !isLoadingUserActions && loadingCommentIds.length === 0) {
        setInitLoading(false);
        if (commentId != null) {
          handleOutlineComment(commentId);
        }
      }
    }, [commentId, initLoading, isLoadingUserActions, loadingCommentIds, handleOutlineComment]);

    const descriptionCommentListObj: EuiCommentProps = useMemo(
      () =>
        getDescriptionUserAction({
          caseData,
          commentRefs,
          manageMarkdownEditIds,
          isLoadingDescription,
          userCanCrud,
          onUpdateField,
          handleManageMarkdownEditId,
          handleManageQuote,
        }),
      [
        caseData,
        commentRefs,
        manageMarkdownEditIds,
        isLoadingDescription,
        userCanCrud,
        onUpdateField,
        handleManageMarkdownEditId,
        handleManageQuote,
      ]
    );

    const userActions: EuiCommentProps[] = useMemo(
      () =>
        caseUserActions.reduce<EuiCommentProps[]>(
          (comments, userAction, index) => {
            if (!isUserActionTypeSupported(userAction.type)) {
              return comments;
            }

            const builder = builderMap[userAction.type];

            if (builder == null) {
              return comments;
            }

            const userActionBuilder = builder({
              caseData,
              userAction,
              caseServices,
              comments: caseData.comments,
              index,
              userCanCrud,
              commentRefs,
              manageMarkdownEditIds,
              selectedOutlineCommentId,
              loadingCommentIds,
              loadingAlertData,
              alertData: manualAlertsData,
              handleOutlineComment,
              handleManageMarkdownEditId,
              handleSaveComment,
              handleManageQuote,
              onShowAlertDetails,
              actionsNavigation,
              getRuleDetailsHref,
              onRuleDetailsClick,
            });
            return [...comments, ...userActionBuilder.build()];
          },
          [descriptionCommentListObj]
        ),
      [
        caseUserActions,
        descriptionCommentListObj,
        caseData,
        caseServices,
        userCanCrud,
        commentRefs,
        manageMarkdownEditIds,
        selectedOutlineCommentId,
        loadingCommentIds,
        loadingAlertData,
        manualAlertsData,
        handleOutlineComment,
        handleManageMarkdownEditId,
        handleSaveComment,
        handleManageQuote,
        onShowAlertDetails,
        actionsNavigation,
        getRuleDetailsHref,
        onRuleDetailsClick,
      ]
    );

    const bottomActions = userCanCrud
      ? [
          {
            username: (
              <UserActionUsername
                username={currentUser?.username}
                fullName={currentUser?.fullName}
              />
            ),
            'data-test-subj': 'add-comment',
            timelineIcon: (
              <UserActionAvatar username={currentUser?.username} fullName={currentUser?.fullName} />
            ),
            className: 'isEdit',
            children: MarkdownNewComment,
          },
        ]
      : [];

    const comments = [...userActions, ...bottomActions];

    return (
      <>
        <MyEuiCommentList comments={comments} data-test-subj="user-actions" />
        {(isLoadingUserActions || loadingCommentIds.includes(NEW_COMMENT_ID)) && (
          <MyEuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner data-test-subj="user-actions-loading" size="l" />
            </EuiFlexItem>
          </MyEuiFlexGroup>
        )}
      </>
    );
  }
);

UserActions.displayName = 'UserActions';
