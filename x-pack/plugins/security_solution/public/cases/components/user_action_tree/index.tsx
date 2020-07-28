/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { EuiFlexGroup, EuiFlexItem, EuiLoadingSpinner } from '@elastic/eui';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import styled from 'styled-components';

import * as i18n from '../case_view/translations';

import { Case, CaseUserActions } from '../../containers/types';
import { useUpdateComment } from '../../containers/use_update_comment';
import { useCurrentUser } from '../../../common/lib/kibana';
import { AddComment } from '../add_comment';
import { getLabelTitle } from './helpers';
import { UserActionItem } from './user_action_item';
import { UserActionMarkdown } from './user_action_markdown';
import { Connector } from '../../../../../case/common/api/cases';
import { CaseServices } from '../../containers/use_get_case_user_actions';
import { parseString } from '../../containers/utils';
import { OnUpdateFields } from '../case_view';

export interface UserActionTreeProps {
  caseServices: CaseServices;
  caseUserActions: CaseUserActions[];
  connectors: Connector[];
  data: Case;
  fetchUserActions: () => void;
  isLoadingDescription: boolean;
  isLoadingUserActions: boolean;
  onUpdateField: ({ key, value, onSuccess, onError }: OnUpdateFields) => void;
  updateCase: (newCase: Case) => void;
  userCanCrud: boolean;
}

const MyEuiFlexGroup = styled(EuiFlexGroup)`
  margin-bottom: 8px;
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
  }: UserActionTreeProps) => {
    const { commentId } = useParams();
    const handlerTimeoutId = useRef(0);
    const [initLoading, setInitLoading] = useState(true);
    const [selectedOutlineCommentId, setSelectedOutlineCommentId] = useState('');
    const { isLoadingIds, patchComment } = useUpdateComment();
    const currentUser = useCurrentUser();
    const [manageMarkdownEditIds, setManangeMardownEditIds] = useState<string[]>([]);
    const [insertQuote, setInsertQuote] = useState<string | null>(null);
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [caseData, handleManageMarkdownEditId, patchComment, updateCase]
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
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [handlerTimeoutId.current]
    );

    const handleManageQuote = useCallback(
      (quote: string) => {
        const addCarrots = quote.replace(new RegExp('\r?\n', 'g'), '  \n> ');
        setInsertQuote(`> ${addCarrots} \n`);
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
          insertQuote={insertQuote}
          onCommentPosted={handleUpdate}
          onCommentSaving={handleManageMarkdownEditId.bind(null, NEW_ID)}
          showLoading={false}
        />
      ),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [caseData.id, handleUpdate, insertQuote, userCanCrud]
    );

    useEffect(() => {
      if (initLoading && !isLoadingUserActions && isLoadingIds.length === 0) {
        setInitLoading(false);
        if (commentId != null) {
          handleOutlineComment(commentId);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [commentId, initLoading, isLoadingUserActions, isLoadingIds]);
    return (
      <>
        <UserActionItem
          createdAt={caseData.createdAt}
          data-test-subj="description-action"
          disabled={!userCanCrud}
          id={DESCRIPTION_ID}
          isEditable={manageMarkdownEditIds.includes(DESCRIPTION_ID)}
          isLoading={isLoadingDescription}
          labelEditAction={i18n.EDIT_DESCRIPTION}
          labelQuoteAction={i18n.QUOTE}
          labelTitle={<>{i18n.ADDED_DESCRIPTION}</>}
          fullName={caseData.createdBy.fullName ?? caseData.createdBy.username ?? ''}
          markdown={MarkdownDescription}
          onEdit={handleManageMarkdownEditId.bind(null, DESCRIPTION_ID)}
          onQuote={handleManageQuote.bind(null, caseData.description)}
          username={caseData.createdBy.username ?? i18n.UNKNOWN}
        />

        {caseUserActions.map((action, index) => {
          if (action.commentId != null && action.action === 'create') {
            const comment = caseData.comments.find((c) => c.id === action.commentId);
            if (comment != null) {
              return (
                <UserActionItem
                  key={action.actionId}
                  createdAt={comment.createdAt}
                  data-test-subj={`comment-create-action`}
                  disabled={!userCanCrud}
                  id={comment.id}
                  idToOutline={selectedOutlineCommentId}
                  isEditable={manageMarkdownEditIds.includes(comment.id)}
                  isLoading={isLoadingIds.includes(comment.id)}
                  labelEditAction={i18n.EDIT_COMMENT}
                  labelQuoteAction={i18n.QUOTE}
                  labelTitle={<>{i18n.ADDED_COMMENT}</>}
                  fullName={comment.createdBy.fullName ?? comment.createdBy.username ?? ''}
                  markdown={
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
                  }
                  onEdit={handleManageMarkdownEditId.bind(null, comment.id)}
                  onQuote={handleManageQuote.bind(null, comment.comment)}
                  outlineComment={handleOutlineComment}
                  username={comment.createdBy.username ?? ''}
                  updatedAt={comment.updatedAt}
                />
              );
            }
          }
          if (action.actionField.length === 1) {
            const myField = action.actionField[0];
            const parsedValue = parseString(`${action.newValue}`);
            const { firstPush, parsedConnectorId, parsedConnectorName } =
              parsedValue != null
                ? {
                    firstPush: caseServices[parsedValue.connector_id].firstPushIndex === index,
                    parsedConnectorId: parsedValue.connector_id,
                    parsedConnectorName: parsedValue.connector_name,
                  }
                : {
                    firstPush: false,
                    parsedConnectorId: 'none',
                    parsedConnectorName: 'none',
                  };
            const labelTitle: string | JSX.Element = getLabelTitle({
              action,
              field: myField,
              firstPush,
              connectors,
            });

            return (
              <UserActionItem
                key={action.actionId}
                caseConnectorName={parsedConnectorName}
                createdAt={action.actionAt}
                data-test-subj={`${action.actionField[0]}-${action.action}-action`}
                disabled={!userCanCrud}
                id={action.actionId}
                isEditable={false}
                isLoading={false}
                labelTitle={<>{labelTitle}</>}
                linkId={
                  action.action === 'update' && action.commentId != null ? action.commentId : null
                }
                fullName={action.actionBy.fullName ?? action.actionBy.username ?? ''}
                outlineComment={handleOutlineComment}
                showTopFooter={
                  action.action === 'push-to-service' &&
                  index === caseServices[parsedConnectorId].lastPushIndex
                }
                showBottomFooter={
                  action.action === 'push-to-service' &&
                  index === caseServices[parsedConnectorId].lastPushIndex &&
                  caseServices[parsedConnectorId].hasDataToPush
                }
                username={action.actionBy.username ?? ''}
              />
            );
          }
          return null;
        })}
        {(isLoadingUserActions || isLoadingIds.includes(NEW_ID)) && (
          <MyEuiFlexGroup justifyContent="center" alignItems="center">
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner data-test-subj="user-actions-loading" size="l" />
            </EuiFlexItem>
          </MyEuiFlexGroup>
        )}
        <UserActionItem
          data-test-subj={`add-comment`}
          createdAt={new Date().toISOString()}
          disabled={!userCanCrud}
          id={NEW_ID}
          isEditable={true}
          isLoading={isLoadingIds.includes(NEW_ID)}
          fullName={currentUser != null ? currentUser.fullName ?? '' : ''}
          markdown={MarkdownNewComment}
          username={currentUser != null ? currentUser.username ?? '' : ''}
        />
      </>
    );
  }
);

UserActionTree.displayName = 'UserActionTree';
