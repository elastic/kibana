/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, EuiSkeletonText, useEuiTheme } from '@elastic/eui';
import type { EuiThemeComputed } from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { css } from '@emotion/react';

import { AddComment } from '../add_comment';
import { useCaseViewParams } from '../../common/navigation';
import { getManualAlertIdsWithNoRuleId } from './helpers';
import type { UserActionTreeProps } from './types';
import { useUserActionsHandler } from './use_user_actions_handler';
import { NEW_COMMENT_ID } from './constants';
import { UserToolTip } from '../user_profiles/user_tooltip';
import { Username } from '../user_profiles/username';
import { HoverableAvatar } from '../user_profiles/hoverable_avatar';
import { UserActionsList } from './user_actions_list';
import { useUserActionsPagination } from './use_user_actions_pagination';
import { useLastPageUserActions } from './use_user_actions_last_page';
import { ShowMoreButton } from './show_more_button';
import { useLastPage } from './use_last_page';
import { useUserPermissions } from './use_user_permissions';

const getIconsCss = (hasNextPage: boolean | undefined, euiTheme: EuiThemeComputed<{}>): string => {
  const customSize = hasNextPage
    ? {
        showMoreSectionSize: euiTheme.size.xxxl,
        marginTopShowMoreSectionSize: euiTheme.size.xxxl,
        marginBottomShowMoreSectionSize: euiTheme.size.xxxl,
      }
    : {
        showMoreSectionSize: euiTheme.size.m,
        marginTopShowMoreSectionSize: euiTheme.size.m,
        marginBottomShowMoreSectionSize: euiTheme.size.m,
      };

  const blockSize = `${customSize.showMoreSectionSize} + ${customSize.marginTopShowMoreSectionSize} +
  ${customSize.marginBottomShowMoreSectionSize}`;
  return `
          .commentList--hasShowMore
            [class*='euiTimelineItem-center']:last-child:not(:only-child)
            > [class*='euiTimelineItemIcon-']::before {
            block-size: calc(
              100% + ${blockSize}
            );
          }
          .commentList--hasShowMore
            [class*='euiTimelineItem-center']:first-child
            > [class*='euiTimelineItemIcon-']::before {
            inset-block-start: 0%;
            block-size: calc(
              100% + ${blockSize}
            );
          }
          .commentList--hasShowMore
              [class*='euiTimelineItem-']
              > [class*='euiTimelineItemIcon-']::before {
              block-size: calc(
                100% + ${blockSize}
              );
              }
        `;
};

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

  const { lastPage } = useLastPage({ userActivityQueryParams, userActionsStats });

  const {
    infiniteCaseUserActions,
    isLoadingInfiniteUserActions,
    hasNextPage,
    fetchNextPage,
    showBottomList,
    isFetchingNextPage,
  } = useUserActionsPagination({
    userActivityQueryParams,
    caseId: caseData.id,
    lastPage,
  });

  const { euiTheme } = useEuiTheme();

  const { isLoadingLastPageUserActions, lastPageUserActions } = useLastPageUserActions({
    userActivityQueryParams,
    caseId: caseData.id,
    lastPage,
  });

  const alertIdsWithoutRuleInfo = useMemo(
    () => getManualAlertIdsWithNoRuleId(caseData.comments),
    [caseData.comments]
  );

  const [loadingAlertData, manualAlertsData] = useFetchAlertData(alertIdsWithoutRuleInfo);

  const { getCanAddUserComments } = useUserPermissions();

  // add-comment markdown is not visible in History filter
  const shouldShowCommentEditor = getCanAddUserComments(userActivityQueryParams);

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

  const bottomActions = shouldShowCommentEditor
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

  return (
    <EuiSkeletonText
      lines={8}
      data-test-subj="user-actions-loading"
      isLoading={
        isLoadingLastPageUserActions ||
        loadingCommentIds.includes(NEW_COMMENT_ID) ||
        isLoadingInfiniteUserActions
      }
    >
      <EuiFlexItem
        {...(showBottomList
          ? {
              css: css`
                ${getIconsCss(hasNextPage, euiTheme)}
              `,
            }
          : {})}
      >
        <UserActionsList
          {...props}
          caseUserActions={infiniteCaseUserActions}
          loadingAlertData={loadingAlertData}
          manualAlertsData={manualAlertsData}
          commentRefs={commentRefs}
          handleManageQuote={handleManageQuote}
          bottomActions={lastPage <= 1 ? bottomActions : []}
          isExpandable
        />
        {hasNextPage && (
          <ShowMoreButton onShowMoreClick={handleShowMore} isLoading={isFetchingNextPage} />
        )}
        {lastPageUserActions?.length ? (
          <EuiFlexItem
            {...(!hasNextPage
              ? {
                  css: css`
                    margin-top: ${euiTheme.size.l};
                  `,
                }
              : {})}
          >
            <UserActionsList
              {...props}
              caseUserActions={lastPageUserActions}
              loadingAlertData={loadingAlertData}
              manualAlertsData={manualAlertsData}
              bottomActions={bottomActions}
              commentRefs={commentRefs}
              handleManageQuote={handleManageQuote}
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexItem>
    </EuiSkeletonText>
  );
});

UserActions.displayName = 'UserActions';
