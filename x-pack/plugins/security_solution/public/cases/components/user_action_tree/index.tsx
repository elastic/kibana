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

import { Case, CaseUserActions } from '../../containers/types';
import { useUpdateComment } from '../../containers/use_update_comment';
import { useCurrentUser } from '../../../common/lib/kibana';
import { AddComment, AddCommentRefObject } from '../add_comment';
import {
  ActionConnector,
  AlertCommentRequestRt,
  CommentType,
  ContextTypeUserRt,
} from '../../../../../case/common/api';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { parseString } from '../../containers/utils';
import { OnUpdateFields } from '../case_view';
import {
  getConnectorLabelTitle,
  getLabelTitle,
  getPushedServiceLabelTitle,
  getPushInfo,
  getUpdateAction,
  getAlertAttachment,
  getGeneratedAlertsAttachment,
  useFetchAlertData,
} from './helpers';
import { UserActionAvatar } from './user_action_avatar';
import { UserActionMarkdown } from './user_action_markdown';
import { UserActionTimestamp } from './user_action_timestamp';
import { UserActionUsername } from './user_action_username';
import { UserActionContentToolbar } from './user_action_content_toolbar';
import { getManualAlertIdsWithNoRuleId } from '../case_view/helpers';

export interface UserActionTreeProps {
  caseServices: CaseServices;
  caseUserActions: CaseUserActions[];
  connectors: ActionConnector[];
  data: Case;
  fetchUserActions: () => void;
  isLoadingDescription: boolean;
  isLoadingUserActions: boolean;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
  updateCase: (newCase: Case) => void;
  userCanCrud: boolean;
  onShowAlertDetails: (alertId: string, index: string) => void;
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
      padding: 10px;
      border-radius: ${theme.eui.paddingSizes.xs};
    }

    & .comment-alert .euiCommentEvent__headerData {
      flex-grow: 1;
    }
  `}
`;

const DESCRIPTION_ID = 'description';
const NEW_ID = 'newComment';

export const UserActionTree = React.memo(
  ({
    data: caseData,
    caseServices,
    caseUserActions,
    connectors,
    fetchUserActions,
    isLoadingDescription,
    isLoadingUserActions,
    onUpdateField,
    updateCase,
    userCanCrud,
    onShowAlertDetails,
  }: UserActionTreeProps) => {
    const { commentId, subCaseId } = useParams<{ commentId?: string; subCaseId?: string }>();
    const handlerTimeoutId = useRef(0);
    const addCommentRef = useRef<AddCommentRefObject>(null);
    const [initLoading, setInitLoading] = useState(true);
    const [selectedOutlineCommentId, setSelectedOutlineCommentId] = useState('');
    const { isLoadingIds, patchComment } = useUpdateComment();
    const currentUser = useCurrentUser();
    const [manageMarkdownEditIds, setManangeMardownEditIds] = useState<string[]>([]);

    const [loadingAlertData, manualAlertsData] = useFetchAlertData(
      getManualAlertIdsWithNoRuleId(caseData.comments)
    );

    const handleManageMarkdownEditId = useCallback(
      (id: string) => {
        if (!manageMarkdownEditIds.includes(id)) {
          setManangeMardownEditIds([...manageMarkdownEditIds, id]);
        } else {
          setManangeMardownEditIds(manageMarkdownEditIds.filter((myId) => id !== myId));
        }
      },
      [manageMarkdownEditIds]
    );

    const handleSaveComment = useCallback(
      ({ id, version }: { id: string; version: string }, content: string) => {
        patchComment({
          caseId: caseData.id,
          commentId: id,
          commentUpdate: content,
          fetchUserActions,
          version,
          updateCase,
        });
      },
      [caseData.id, fetchUserActions, patchComment, updateCase]
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

        if (addCommentRef && addCommentRef.current) {
          addCommentRef.current.addQuote(`> ${addCarrots} \n`);
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
          caseId={caseData.id}
          disabled={!userCanCrud}
          ref={addCommentRef}
          onCommentPosted={handleUpdate}
          onCommentSaving={handleManageMarkdownEditId.bind(null, NEW_ID)}
          showLoading={false}
          subCaseId={subCaseId}
        />
      ),
      [caseData.id, handleUpdate, userCanCrud, handleManageMarkdownEditId, subCaseId]
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
            id={DESCRIPTION_ID}
            editLabel={i18n.EDIT_DESCRIPTION}
            quoteLabel={i18n.QUOTE}
            disabled={!userCanCrud}
            isLoading={isLoadingDescription}
            onEdit={handleManageMarkdownEditId.bind(null, DESCRIPTION_ID)}
            onQuote={handleManageQuote.bind(null, caseData.description)}
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
          // eslint-disable-next-line complexity
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
                        id={comment.id}
                        editLabel={i18n.EDIT_COMMENT}
                        quoteLabel={i18n.QUOTE}
                        disabled={!userCanCrud}
                        isLoading={isLoadingIds.includes(comment.id)}
                        onEdit={handleManageMarkdownEditId.bind(null, comment.id)}
                        onQuote={handleManageQuote.bind(null, comment.comment)}
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

                const ruleId = comment?.rule?.id ?? manualAlertsData[alertId]?.rule?.id?.[0] ?? '';
                const ruleName =
                  comment?.rule?.name ??
                  manualAlertsData[alertId]?.rule?.name?.[0] ??
                  i18n.UNKNOWN_RULE;

                return [
                  ...comments,
                  getAlertAttachment({
                    action,
                    alertId,
                    index: alertIndex,
                    loadingAlertData,
                    ruleId,
                    ruleName,
                    onShowAlertDetails,
                  }),
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
                  getGeneratedAlertsAttachment({
                    action,
                    alertIds,
                    ruleId: comment.rule?.id ?? '',
                    ruleName: comment.rule?.name ?? i18n.UNKNOWN_RULE,
                  }),
                ];
              }
            }

            // Connectors
            if (action.actionField.length === 1 && action.actionField[0] === 'connector') {
              const label = getConnectorLabelTitle({ action, connectors });
              return [...comments, getUpdateAction({ action, label, handleOutlineComment })];
            }

            // Pushed information
            if (action.actionField.length === 1 && action.actionField[0] === 'pushed') {
              const parsedValue = parseString(`${action.newValue}`);
              const { firstPush, parsedConnectorId, parsedConnectorName } = getPushInfo(
                caseServices,
                parsedValue,
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
                getUpdateAction({ action, label, handleOutlineComment }),
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

              return [...comments, getUpdateAction({ action, label, handleOutlineComment })];
            }

            return comments;
          },
          [descriptionCommentListObj]
        ),
      [
        caseData,
        caseServices,
        caseUserActions,
        connectors,
        handleOutlineComment,
        descriptionCommentListObj,
        handleManageMarkdownEditId,
        handleManageQuote,
        handleSaveComment,
        isLoadingIds,
        loadingAlertData,
        manualAlertsData,
        manageMarkdownEditIds,
        selectedOutlineCommentId,
        userCanCrud,
        onShowAlertDetails,
      ]
    );

    const bottomActions = [
      {
        username: (
          <UserActionUsername username={currentUser?.username} fullName={currentUser?.fullName} />
        ),
        'data-test-subj': 'add-comment',
        timelineIcon: (
          <UserActionAvatar username={currentUser?.username} fullName={currentUser?.fullName} />
        ),
        className: 'isEdit',
        children: MarkdownNewComment,
      },
    ];

    const comments = [...userActions, ...bottomActions];

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
