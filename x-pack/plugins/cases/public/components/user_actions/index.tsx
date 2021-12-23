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

import classNames from 'classnames';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import styled from 'styled-components';

import { useUpdateComment } from '../../containers/use_update_comment';
import { useCurrentUser } from '../../common/lib/kibana';
import { AddComment, AddCommentRefObject } from '../add_comment';
import { Case, CaseUserActions, Ecs } from '../../../common/ui/types';
import { ActionConnector } from '../../../common/api';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { UserActionAvatar } from './user_action_avatar';
import { UserActionMarkdown, UserActionMarkdownRefObject } from './user_action_markdown';
import { UserActionTimestamp } from './user_action_timestamp';
import { UserActionUsername } from './user_action_username';
import { UserActionContentToolbar } from './user_action_content_toolbar';
import { getManualAlertIdsWithNoRuleId } from '../case_view/helpers';
import { useLensDraftComment } from '../markdown_editor/plugins/lens/use_lens_draft_comment';
import { useCaseViewParams } from '../../common/navigation';
import type { OnUpdateFields } from '../case_view/types';
import { builderMap } from './builder';
import { ActionsNavigation, RuleDetailsNavigation } from './types';
import * as i18n from './translations';
import { isUserActionTypeSupported } from './helpers';

export interface UserActionTreeProps {
  caseServices: CaseServices;
  caseUserActions: CaseUserActions[];
  connectors: ActionConnector[];
  data: Case;
  fetchUserActions: () => void;
  getRuleDetailsHref?: RuleDetailsNavigation['href'];
  actionsNavigation?: ActionsNavigation;
  isLoadingDescription: boolean;
  isLoadingUserActions: boolean;
  onRuleDetailsClick?: RuleDetailsNavigation['onClick'];
  onShowAlertDetails: (alertId: string, index: string) => void;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
  renderInvestigateInTimelineActionComponent?: (alertIds: string[]) => JSX.Element;
  statusActionButton: JSX.Element | null;
  updateCase: (newCase: Case) => void;
  useFetchAlertData: (alertIds: string[]) => [boolean, Record<string, Ecs>];
  userCanCrud: boolean;
}

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

const DESCRIPTION_ID = 'description';
const NEW_ID = 'newComment';

const isAddCommentRef = (
  ref: AddCommentRefObject | UserActionMarkdownRefObject | null | undefined
): ref is AddCommentRefObject => {
  const commentRef = ref as AddCommentRefObject;
  if (commentRef?.addQuote != null) {
    return true;
  }

  return false;
};

export const UserActions = React.memo(
  ({
    caseServices,
    caseUserActions,
    connectors,
    data: caseData,
    fetchUserActions,
    getRuleDetailsHref,
    actionsNavigation,
    isLoadingDescription,
    isLoadingUserActions,
    onRuleDetailsClick,
    onShowAlertDetails,
    onUpdateField,
    renderInvestigateInTimelineActionComponent,
    statusActionButton,
    updateCase,
    useFetchAlertData,
    userCanCrud,
  }: UserActionTreeProps) => {
    const { detailName: caseId, subCaseId, commentId } = useCaseViewParams();
    const handlerTimeoutId = useRef(0);
    const [initLoading, setInitLoading] = useState(true);
    const [selectedOutlineCommentId, setSelectedOutlineCommentId] = useState('');
    const { isLoadingIds, patchComment } = useUpdateComment();
    const currentUser = useCurrentUser();
    const [manageMarkdownEditIds, setManageMarkdownEditIds] = useState<string[]>([]);
    const commentRefs = useRef<
      Record<string, AddCommentRefObject | UserActionMarkdownRefObject | undefined | null>
    >({});
    const { clearDraftComment, draftComment, hasIncomingLensState, openLensModal } =
      useLensDraftComment();

    const [loadingAlertData, manualAlertsData] = useFetchAlertData(
      getManualAlertIdsWithNoRuleId(caseData.comments)
    );

    const handleManageMarkdownEditId = useCallback(
      (id: string) => {
        clearDraftComment();
        setManageMarkdownEditIds((prevManageMarkdownEditIds) =>
          !prevManageMarkdownEditIds.includes(id)
            ? prevManageMarkdownEditIds.concat(id)
            : prevManageMarkdownEditIds.filter((myId) => id !== myId)
        );
      },
      [clearDraftComment]
    );

    const handleSaveComment = useCallback(
      ({ id, version }: { id: string; version: string }, content: string) => {
        patchComment({
          caseId,
          commentId: id,
          commentUpdate: content,
          fetchUserActions,
          version,
          updateCase,
          subCaseId,
        });
      },
      [caseId, fetchUserActions, patchComment, subCaseId, updateCase]
    );

    const handleOutlineComment = useCallback(
      (id: string) => {
        const moveToTarget = document.getElementById(`${id}-permLink`);
        if (moveToTarget != null) {
          const yOffset = -60;
          const y = moveToTarget.getBoundingClientRect().top + window.pageYOffset + yOffset;
          window.scrollTo({
            top: y,
            behavior: 'smooth',
          });
          if (id === 'add-comment') {
            moveToTarget.getElementsByTagName('textarea')[0].focus();
          }
        }
        window.clearTimeout(handlerTimeoutId.current);
        setSelectedOutlineCommentId(id);
        handlerTimeoutId.current = window.setTimeout(() => {
          setSelectedOutlineCommentId('');
          window.clearTimeout(handlerTimeoutId.current);
        }, 2400);
      },
      [handlerTimeoutId]
    );

    const handleManageQuote = useCallback(
      (quote: string) => {
        const ref = commentRefs?.current[NEW_ID];
        if (isAddCommentRef(ref)) {
          ref.addQuote(quote);
        }

        handleOutlineComment('add-comment');
      },
      [handleOutlineComment]
    );

    const handleUpdate = useCallback(
      (newCase: Case) => {
        updateCase(newCase);
        fetchUserActions();
      },
      [fetchUserActions, updateCase]
    );

    const MarkdownDescription = useMemo(
      () => (
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
      [caseData.description, handleManageMarkdownEditId, manageMarkdownEditIds, onUpdateField]
    );

    const MarkdownNewComment = useMemo(
      () => (
        <AddComment
          id={NEW_ID}
          caseId={caseId}
          userCanCrud={userCanCrud}
          ref={(element) => (commentRefs.current[NEW_ID] = element)}
          onCommentPosted={handleUpdate}
          onCommentSaving={handleManageMarkdownEditId.bind(null, NEW_ID)}
          showLoading={false}
          statusActionButton={statusActionButton}
          subCaseId={subCaseId}
        />
      ),
      [caseId, userCanCrud, handleUpdate, handleManageMarkdownEditId, statusActionButton, subCaseId]
    );

    useEffect(() => {
      if (initLoading && !isLoadingUserActions && isLoadingIds.length === 0) {
        setInitLoading(false);
        if (commentId != null) {
          handleOutlineComment(commentId);
        }
      }
    }, [commentId, initLoading, isLoadingUserActions, isLoadingIds, handleOutlineComment]);

    const descriptionCommentListObj: EuiCommentProps = useMemo(
      () => ({
        username: (
          <UserActionUsername
            username={caseData.createdBy.username}
            fullName={caseData.createdBy.fullName}
          />
        ),
        event: i18n.ADDED_DESCRIPTION,
        'data-test-subj': 'description-action',
        timestamp: <UserActionTimestamp createdAt={caseData.createdAt} />,
        children: MarkdownDescription,
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
      }),
      [
        MarkdownDescription,
        caseData,
        handleManageMarkdownEditId,
        handleManageQuote,
        isLoadingDescription,
        userCanCrud,
        manageMarkdownEditIds,
      ]
    );

    const userActions: EuiCommentProps[] = useMemo(
      () =>
        caseUserActions.reduce<EuiCommentProps[]>(
          (comments, userAction, index) => {
            if (isUserActionTypeSupported(userAction.type)) {
              const builder = builderMap[userAction.type];
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
                isLoadingIds,
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
            }
            return comments;
          },
          [descriptionCommentListObj]
        ),
      [
        caseUserActions,
        descriptionCommentListObj,
        caseData,
        caseServices,
        userCanCrud,
        manageMarkdownEditIds,
        selectedOutlineCommentId,
        isLoadingIds,
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

    useEffect(() => {
      if (draftComment?.commentId) {
        setManageMarkdownEditIds((prevManageMarkdownEditIds) => {
          if (
            ![NEW_ID].includes(draftComment?.commentId) &&
            !prevManageMarkdownEditIds.includes(draftComment?.commentId)
          ) {
            return [draftComment?.commentId];
          }
          return prevManageMarkdownEditIds;
        });

        const ref = commentRefs?.current?.[draftComment.commentId];

        if (isAddCommentRef(ref) && ref.editor?.textarea) {
          ref.setComment(draftComment.comment);
          if (hasIncomingLensState) {
            openLensModal({ editorRef: ref.editor });
          } else {
            clearDraftComment();
          }
        }
      }
    }, [
      draftComment,
      openLensModal,
      commentRefs,
      hasIncomingLensState,
      clearDraftComment,
      manageMarkdownEditIds,
    ]);

    return (
      <>
        <MyEuiCommentList comments={comments} data-test-subj="user-actions" />
        {(isLoadingUserActions || isLoadingIds.includes(NEW_ID)) && (
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
