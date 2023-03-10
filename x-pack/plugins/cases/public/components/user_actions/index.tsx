/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiFlexItem, EuiPanel, EuiSkeletonText, useEuiTheme } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import styled from 'styled-components';
import { css } from '@emotion/react';

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
import * as i18n from './translations';
import { useUserActionsPagination } from './use_user_actions_pagination';

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
  const { detailName: caseId } = useCaseViewParams();
  const {
    isLoadingInfiniteUserActions,
    lastPage,
    caseUserActions: infiniteUserActions,
    hasNextPage,
    fetchNextPage,
    showLoadMore,
    showBottomList,
  } = useUserActionsPagination({
    userActivityQueryParams,
    userActionsStats,
    caseId: caseData.id,
    isExpandable: true,
  });

  const { caseUserActions, isLoadingUserActions } = useUserActionsPagination({
    userActivityQueryParams: { ...userActivityQueryParams, page: lastPage },
    userActionsStats,
    caseId: caseData.id,
    isExpandable: false,
  });

  const alertIdsWithoutRuleInfo = useMemo(
    () => getManualAlertIdsWithNoRuleId(caseData.comments),
    [caseData.comments]
  );

  const [loadingAlertData, manualAlertsData] = useFetchAlertData(alertIdsWithoutRuleInfo);

  const { permissions } = useCasesContext();

  const showCommentEditor = permissions.create && userActivityQueryParams.type !== 'action'; // add-comment markdown is not visible in History filter

  const {
    commentRefs,
    handleManageMarkdownEditId,
    handleManageQuote,
    handleUpdate,
    loadingCommentIds,
  } = useUserActionsHandler();

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

  const handleShowMore = useCallback(() => {
    if (fetchNextPage) {
      fetchNextPage();
    }
  }, [fetchNextPage]);

  const { euiTheme } = useEuiTheme();

  const customSize =
    showLoadMore && hasNextPage
      ? {
          showMoreSectionSize: euiTheme.size.xxxl,
          marginTopShowMoreSectionSize: euiTheme.size.xl,
          marginBottomShowMoreSectionSize: euiTheme.size.xl,
        }
      : {
          showMoreSectionSize: euiTheme.size.s,
          marginTopShowMoreSectionSize: euiTheme.size.s,
          marginBottomShowMoreSectionSize: euiTheme.size.s,
        };

  return (
    <EuiSkeletonText
      lines={8}
      data-test-subj="user-actions-loading"
      isLoading={
        showLoadMore && hasNextPage
          ? isLoadingInfiniteUserActions
          : isLoadingUserActions || loadingCommentIds.includes(NEW_COMMENT_ID)
      }
    >
      <EuiPanel
        color="plain"
        hasShadow={false}
        css={css`
          .commentList--hasShowMore
            [class*='euiTimelineItem-center']:last-child:not(:only-child)
            > [class*='euiTimelineItemIcon-']::before {
            block-size: calc(
              100% + ${customSize.showMoreSectionSize} + ${customSize.marginTopShowMoreSectionSize} +
                ${customSize.marginBottomShowMoreSectionSize}
            );
          }
          .commentList--hasShowMore
            [class*='euiTimelineItem-center']:first-child
            > [class*='euiTimelineItemIcon-']::before {
            inset-block-start: 0%;
            block-size: calc(
              100% + ${customSize.showMoreSectionSize} + ${customSize.marginTopShowMoreSectionSize} +
                ${customSize.marginBottomShowMoreSectionSize}
            );
          }
        `}
      >
        <UserActionsList
          {...props}
          caseUserActions={infiniteUserActions}
          loadingAlertData={loadingAlertData}
          manualAlertsData={manualAlertsData}
          commentRefs={commentRefs}
          handleManageQuote={handleManageQuote}
          bottomActions={lastPage === 0 ? bottomActions : []}
          isExpandable
        />
        {showLoadMore && hasNextPage && (
          <EuiPanel
            color="subdued"
            css={css`
              display: flex;
              justify-content: center;
              margin-block: ${euiTheme.size.base};
              margin-inline-start: ${euiTheme.size.xxxl};
            `}
          >
            <EuiButton
              fill
              color="text"
              size="s"
              onClick={handleShowMore}
              data-test-subj="show-more-user-actions"
            >
              {i18n.SHOW_MORE}
            </EuiButton>
          </EuiPanel>
        )}
        {showBottomList ? (
          <BottomUserActionsListWrapper>
            <UserActionsList
              {...props}
              caseUserActions={caseUserActions}
              loadingAlertData={loadingAlertData}
              manualAlertsData={manualAlertsData}
              bottomActions={bottomActions}
              commentRefs={commentRefs}
              handleManageQuote={handleManageQuote}
            />
          </BottomUserActionsListWrapper>
        ) : null}
      </EuiPanel>
    </EuiSkeletonText>
  );
});

UserActions.displayName = 'UserActions';
