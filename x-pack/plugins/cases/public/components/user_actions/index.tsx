/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem } from '@elastic/eui';
import React, { useMemo, useState, useEffect } from 'react';
import styled from 'styled-components';

import { AddComment } from '../add_comment';
import { useCaseViewParams } from '../../common/navigation';
import { getManualAlertIdsWithNoRuleId } from './helpers';
import type { UserActionTreeProps } from './types';
import { useUserActionsHandler } from './use_user_actions_handler';
import { NEW_COMMENT_ID } from './constants';
import { useCasesContext } from '../cases_context/use_cases_context';
import { UserToolTip } from '../user_profiles/user_tooltip';
import { Username } from '../user_profiles/username';
import { HoverableAvatar } from '../user_profiles/hoverable_avatar';
import { UserActionsList } from './user_actions_list';

const BottomUserActionsListWrapper = styled(EuiFlexItem)`
  padding-top: 16px;
`;

export const UserActions = React.memo((props: UserActionTreeProps) => {
  const {
    currentUserProfile,
    data: caseData,
    statusActionButton,
    useFetchAlertData,
    userActivityQueryParams,
    userActionsStats,
  } = props;
  const { detailName: caseId, commentId } = useCaseViewParams();
  const [initLoading, setInitLoading] = useState(true);

  const lastPage = useMemo(() => {
    if (!userActionsStats) {
      return 1;
    }

    const perPage = userActivityQueryParams.perPage;

    if (userActivityQueryParams.type === 'action') {
      return Math.ceil(userActionsStats.totalOtherActions / perPage);
    } else if (userActivityQueryParams.type === 'user') {
      return Math.ceil(userActionsStats.totalComments / perPage);
    }
    return Math.ceil(userActionsStats.total / perPage);
  }, [userActionsStats, userActivityQueryParams]);

  const alertIdsWithoutRuleInfo = useMemo(
    () => getManualAlertIdsWithNoRuleId(caseData.comments),
    [caseData.comments]
  );

  const [loadingAlertData, manualAlertsData] = useFetchAlertData(alertIdsWithoutRuleInfo);

  const { permissions } = useCasesContext();

  const showCommentEditor = permissions.create && userActivityQueryParams.type !== 'action'; // add-comment markdown is not visible in History filter

  const {
    loadingCommentIds,
    commentRefs,
    selectedOutlineCommentId,
    manageMarkdownEditIds,
    handleManageMarkdownEditId,
    handleOutlineComment,
    handleSaveComment,
    handleManageQuote,
    handleDeleteComment,
    handleUpdate,
  } = useUserActionsHandler();

  useEffect(() => {
    if (initLoading && loadingCommentIds.length === 0) {
      setInitLoading(false);
      if (commentId != null) {
        handleOutlineComment(commentId);
      }
    }
  }, [commentId, initLoading, loadingCommentIds, handleOutlineComment]);

  const MarkdownNewComment = useMemo(
    () => (
      <AddComment
        id={NEW_COMMENT_ID}
        caseId={caseId}
        ref={(element) => (commentRefs.current[NEW_COMMENT_ID] = element)}
        onCommentPosted={handleUpdate}
        onCommentSaving={handleManageMarkdownEditId.bind(null, NEW_COMMENT_ID)}
        showLoading={false}
        statusActionButton={statusActionButton}
      />
    ),
    [caseId, handleUpdate, handleManageMarkdownEditId, statusActionButton, commentRefs]
  );

  const bottomActions = showCommentEditor
    ? [
        {
          username: (
            <UserToolTip userInfo={currentUserProfile}>
              <Username userInfo={currentUserProfile} />
            </UserToolTip>
          ),
          'data-test-subj': 'add-comment',
          timelineAvatar: <HoverableAvatar userInfo={currentUserProfile} />,
          className: 'isEdit',
          children: MarkdownNewComment,
        },
      ]
    : [];

  return (
    <>
      <UserActionsList
        {...props}
        key={`top-${userActivityQueryParams.type}-${userActivityQueryParams.sortOrder}`}
        loadingAlertData={loadingAlertData}
        manualAlertsData={manualAlertsData}
        loadingCommentIds={loadingCommentIds}
        commentRefs={commentRefs}
        selectedOutlineCommentId={selectedOutlineCommentId}
        manageMarkdownEditIds={manageMarkdownEditIds}
        handleManageMarkdownEditId={handleManageMarkdownEditId}
        handleOutlineComment={handleOutlineComment}
        handleSaveComment={handleSaveComment}
        handleManageQuote={handleManageQuote}
        handleDeleteComment={handleDeleteComment}
        isExpandable
      />
      {lastPage > 0 && (
        <BottomUserActionsListWrapper>
          <UserActionsList
            {...props}
            loadingAlertData={loadingAlertData}
            manualAlertsData={manualAlertsData}
            bottomActions={bottomActions}
            loadingCommentIds={loadingCommentIds}
            commentRefs={commentRefs}
            selectedOutlineCommentId={selectedOutlineCommentId}
            manageMarkdownEditIds={manageMarkdownEditIds}
            handleManageMarkdownEditId={handleManageMarkdownEditId}
            handleOutlineComment={handleOutlineComment}
            handleSaveComment={handleSaveComment}
            handleManageQuote={handleManageQuote}
            handleDeleteComment={handleDeleteComment}
            userActivityQueryParams={{ ...userActivityQueryParams, page: lastPage }}
          />
        </BottomUserActionsListWrapper>
      )}
    </>
  );
});

UserActions.displayName = 'UserActions';
