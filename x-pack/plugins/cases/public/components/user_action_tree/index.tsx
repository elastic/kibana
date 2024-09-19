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
import { isEmpty } from 'lodash';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';
import { isRight } from 'fp-ts/Either';

import * as i18n from './translations';

import { useUpdateComment } from '../../containers/use_update_comment';
import { useCurrentUser } from '../../common/lib/kibana';
import { AddComment } from '../add_comment';
import {
  ActionConnector,
  ActionsCommentRequestRt,
  AlertCommentRequestRt,
  Case,
  CaseUserActions,
  CommentType,
  ContextTypeUserRt,
  Ecs,
} from '../../../common';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { parseStringAsExternalService } from '../../common/user_actions';
import { OnUpdateFields } from '../case_view';
import {
  getConnectorLabelTitle,
  getLabelTitle,
  getPushedServiceLabelTitle,
  getPushInfo,
  getUpdateAction,
  getAlertAttachment,
  getGeneratedAlertsAttachment,
  RuleDetailsNavigation,
  ActionsNavigation,
  getActionAttachment,
} from './helpers';
import { UserActionAvatar } from './user_action_avatar';
import { UserActionMarkdown } from './user_action_markdown';
import { UserActionTimestamp } from './user_action_timestamp';
import { UserActionUsername } from './user_action_username';
import { UserActionContentToolbar } from './user_action_content_toolbar';
import { getManualAlertIdsWithNoRuleId } from '../case_view/helpers';
import { useLensDraftComment } from '../markdown_editor/plugins/lens/use_lens_draft_comment';

export interface UserActionTreeProps {
  caseServices: CaseServices;
  caseUserActions: CaseUserActions[];
  connectors: ActionConnector[];
  data: Case;
  fetchUserActions: () => void;
  getCaseDetailHrefWithCommentId: (commentId: string) => string;
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

export const UserActionTree = React.memo(
  ({
    caseServices,
    caseUserActions,
    connectors,
    data: caseData,
    fetchUserActions,
    getCaseDetailHrefWithCommentId,
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
    const {
      detailName: caseId,
      commentId,
      subCaseId,
    } = useParams<{
      detailName: string;
      commentId?: string;
      subCaseId?: string;
    }>();
    const handlerTimeoutId = useRef(0);
    const [initLoading, setInitLoading] = useState(true);
    const [selectedOutlineCommentId, setSelectedOutlineCommentId] = useState('');
    const { isLoadingIds, patchComment } = useUpdateComment();
    const currentUser = useCurrentUser();
    const [manageMarkdownEditIds, setManageMarkdownEditIds] = useState<string[]>([]);
    const commentRefs = useRef<Record<string, any>>({});
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
        const addCarrots = quote.replace(new RegExp('\r?\n', 'g'), '  \n> ');

        if (commentRefs.current[NEW_ID]) {
          commentRefs.current[NEW_ID].addQuote(`> ${addCarrots} \n`);
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
            getCaseDetailHrefWithCommentId={getCaseDetailHrefWithCommentId}
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
        getCaseDetailHrefWithCommentId,
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
          (comments, action, index) => {
            // Comment creation
            if (action.commentId != null && action.action === 'create') {
              const comment = caseData.comments.find((c) => c.id === action.commentId);
              if (
                comment != null &&
                isRight(ContextTypeUserRt.decode(comment)) &&
                comment.type === CommentType.user
              ) {
                return [
                  ...comments,
                  {
                    username: (
                      <UserActionUsername
                        username={comment.createdBy.username}
                        fullName={comment.createdBy.fullName}
                      />
                    ),
                    'data-test-subj': `comment-create-action-${comment.id}`,
                    timestamp: (
                      <UserActionTimestamp
                        createdAt={comment.createdAt}
                        updatedAt={comment.updatedAt}
                      />
                    ),
                    className: classNames('userAction__comment', {
                      outlined: comment.id === selectedOutlineCommentId,
                      isEdit: manageMarkdownEditIds.includes(comment.id),
                    }),
                    children: (
                      <UserActionMarkdown
                        ref={(element) => (commentRefs.current[comment.id] = element)}
                        id={comment.id}
                        content={comment.comment}
                        isEditable={manageMarkdownEditIds.includes(comment.id)}
                        onChangeEditable={handleManageMarkdownEditId}
                        onSaveContent={handleSaveComment.bind(null, {
                          id: comment.id,
                          version: comment.version,
                        })}
                      />
                    ),
                    timelineIcon: (
                      <UserActionAvatar
                        username={comment.createdBy.username}
                        fullName={comment.createdBy.fullName}
                      />
                    ),
                    actions: (
                      <UserActionContentToolbar
                        getCaseDetailHrefWithCommentId={getCaseDetailHrefWithCommentId}
                        id={comment.id}
                        commentMarkdown={comment.comment}
                        editLabel={i18n.EDIT_COMMENT}
                        quoteLabel={i18n.QUOTE}
                        isLoading={isLoadingIds.includes(comment.id)}
                        onEdit={handleManageMarkdownEditId.bind(null, comment.id)}
                        onQuote={handleManageQuote.bind(null, comment.comment)}
                        userCanCrud={userCanCrud}
                      />
                    ),
                  },
                ];
              } else if (
                comment != null &&
                isRight(AlertCommentRequestRt.decode(comment)) &&
                comment.type === CommentType.alert
              ) {
                // TODO: clean this up
                const alertId = Array.isArray(comment.alertId)
                  ? comment.alertId.length > 0
                    ? comment.alertId[0]
                    : ''
                  : comment.alertId;

                const alertIndex = Array.isArray(comment.index)
                  ? comment.index.length > 0
                    ? comment.index[0]
                    : ''
                  : comment.index;

                if (isEmpty(alertId)) {
                  return comments;
                }

                const ruleId =
                  comment?.rule?.id ?? manualAlertsData[alertId]?.signal?.rule?.id?.[0] ?? null;
                const ruleName =
                  comment?.rule?.name ?? manualAlertsData[alertId]?.signal?.rule?.name?.[0] ?? null;

                return [
                  ...comments,
                  ...(getRuleDetailsHref != null
                    ? [
                        getAlertAttachment({
                          action,
                          alertId,
                          getCaseDetailHrefWithCommentId,
                          getRuleDetailsHref,
                          index: alertIndex,
                          loadingAlertData,
                          onRuleDetailsClick,
                          ruleId,
                          ruleName,
                          onShowAlertDetails,
                        }),
                      ]
                    : []),
                ];
              } else if (comment != null && comment.type === CommentType.generatedAlert) {
                // TODO: clean this up
                const alertIds = Array.isArray(comment.alertId)
                  ? comment.alertId
                  : [comment.alertId];

                if (isEmpty(alertIds)) {
                  return comments;
                }

                return [
                  ...comments,
                  ...(getRuleDetailsHref != null
                    ? [
                        getGeneratedAlertsAttachment({
                          action,
                          alertIds,
                          getCaseDetailHrefWithCommentId,
                          getRuleDetailsHref,
                          onRuleDetailsClick,
                          renderInvestigateInTimelineActionComponent,
                          ruleId: comment.rule?.id ?? '',
                          ruleName: comment.rule?.name ?? i18n.UNKNOWN_RULE,
                        }),
                      ]
                    : []),
                ];
              } else if (
                comment != null &&
                isRight(ActionsCommentRequestRt.decode(comment)) &&
                comment.type === CommentType.actions
              ) {
                return [
                  ...comments,
                  ...(comment.actions !== null
                    ? [
                        getActionAttachment({
                          comment,
                          userCanCrud,
                          isLoadingIds,
                          getCaseDetailHrefWithCommentId,
                          actionsNavigation,
                          action,
                        }),
                      ]
                    : []),
                ];
              }
            }

            // Connectors
            if (action.actionField.length === 1 && action.actionField[0] === 'connector') {
              const label = getConnectorLabelTitle({ action, connectors });
              return [
                ...comments,
                getUpdateAction({
                  action,
                  label,
                  getCaseDetailHrefWithCommentId,
                  handleOutlineComment,
                }),
              ];
            }

            // Pushed information
            if (action.actionField.length === 1 && action.actionField[0] === 'pushed') {
              const parsedExternalService = parseStringAsExternalService(
                action.newValConnectorId,
                action.newValue
              );

              const { firstPush, parsedConnectorId, parsedConnectorName } = getPushInfo(
                caseServices,
                parsedExternalService,
                index
              );

              const label = getPushedServiceLabelTitle(action, firstPush);

              const showTopFooter =
                action.action === 'push-to-service' &&
                index === caseServices[parsedConnectorId]?.lastPushIndex;

              const showBottomFooter =
                action.action === 'push-to-service' &&
                index === caseServices[parsedConnectorId]?.lastPushIndex &&
                caseServices[parsedConnectorId].hasDataToPush;

              let footers: EuiCommentProps[] = [];

              if (showTopFooter) {
                footers = [
                  ...footers,
                  {
                    username: '',
                    type: 'update',
                    event: i18n.ALREADY_PUSHED_TO_SERVICE(`${parsedConnectorName}`),
                    timelineIcon: 'sortUp',
                    'data-test-subj': 'top-footer',
                  },
                ];
              }

              if (showBottomFooter) {
                footers = [
                  ...footers,
                  {
                    username: '',
                    type: 'update',
                    event: i18n.REQUIRED_UPDATE_TO_SERVICE(`${parsedConnectorName}`),
                    timelineIcon: 'sortDown',
                    'data-test-subj': 'bottom-footer',
                  },
                ];
              }

              return [
                ...comments,
                getUpdateAction({
                  action,
                  label,
                  getCaseDetailHrefWithCommentId,
                  handleOutlineComment,
                }),
                ...footers,
              ];
            }

            // title, description, comment updates, tags
            if (
              action.actionField.length === 1 &&
              ['title', 'description', 'comment', 'tags', 'status'].includes(action.actionField[0])
            ) {
              const myField = action.actionField[0];
              const label: string | JSX.Element = getLabelTitle({
                action,
                field: myField,
              });

              return [
                ...comments,
                getUpdateAction({
                  action,
                  label,
                  getCaseDetailHrefWithCommentId,
                  handleOutlineComment,
                }),
              ];
            }

            return comments;
          },
          [descriptionCommentListObj]
        ),
      [
        caseUserActions,
        descriptionCommentListObj,
        caseData.comments,
        selectedOutlineCommentId,
        manageMarkdownEditIds,
        handleManageMarkdownEditId,
        handleSaveComment,
        getCaseDetailHrefWithCommentId,
        actionsNavigation,
        userCanCrud,
        isLoadingIds,
        handleManageQuote,
        manualAlertsData,
        getRuleDetailsHref,
        loadingAlertData,
        onRuleDetailsClick,
        onShowAlertDetails,
        renderInvestigateInTimelineActionComponent,
        connectors,
        handleOutlineComment,
        caseServices,
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

        if (
          commentRefs.current &&
          commentRefs.current[draftComment.commentId] &&
          commentRefs.current[draftComment.commentId].editor?.textarea &&
          commentRefs.current[draftComment.commentId].editor?.toolbar
        ) {
          commentRefs.current[draftComment.commentId].setComment(draftComment.comment);
          if (hasIncomingLensState) {
            openLensModal({ editorRef: commentRefs.current[draftComment.commentId].editor });
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

UserActionTree.displayName = 'UserActionTree';
